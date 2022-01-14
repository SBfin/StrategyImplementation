pragma solidity 0.7.6;

import "../interfaces/external/IWETH9.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3MintCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol";
import "@uniswap/v3-periphery/contracts/libraries/PositionKey.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IOrbitVault.sol";
import "./AlphaVault.sol";

contract AlphaVaultUtility is 
    ReentrancyGuard,
    IUniswapV3SwapCallback
    {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    address public immutable weth;
    AlphaVault public immutable alphaVault;
    bool token0IsWeth;
    IERC20 public immutable token0;
    IERC20 public immutable token1;
    uint256 public immutable PRECISION = 1e18;
    
    event SwapAmount(
        uint amount0Desired,
        uint amount1Desired,
        int amount0Swapped,
        int amount1Swapped
    );

    event SwapInputs(
        uint amountTokenDesired,
        int amountToSwap,
        uint ratio,
        uint price
    );

    event AmountsPostSwap(
        uint total0,
        uint total1
    );

    constructor(address _alphaVault, address wethAddress) {
            alphaVault = AlphaVault(_alphaVault);
            weth = wethAddress;
            IUniswapV3Pool pool = AlphaVault(_alphaVault).pool();
            token0IsWeth = pool.token0() == wethAddress;

            token0 = IERC20(AlphaVault(_alphaVault).token0());
            token1 = IERC20(AlphaVault(_alphaVault).token1());
            
            bool approve0 = IERC20(AlphaVault(_alphaVault).token0()).approve(_alphaVault, 115792089237316195423570985008687907853269984665640564039457584007913129639935);
            bool approve1 = IERC20(AlphaVault(_alphaVault).token1()).approve(_alphaVault, 115792089237316195423570985008687907853269984665640564039457584007913129639935);
            require(approve0 && approve1, "approval");
        }

    function depositEth(
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountEthMin,
        address to
    )
        external
        nonReentrant
        payable
        returns (
            uint256 shares,
            uint256 amount0,
            uint256 amount1
        )
    {      
        // switch to and
        require(amountTokenDesired > 0 || msg.value > 0, "amountTokenDesired or value");
        require(to != address(0) && to != address(this) && to != address(alphaVault), "to");

        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount1Min;
        uint256 amount0Min;

        if (token0IsWeth) {
            amount0Desired = msg.value;
            amount1Desired = amountTokenDesired;
            amount0Min = amountEthMin;
            amount1Min = amountTokenMin;
        } else {
            amount0Desired = amountTokenDesired;
            amount1Desired = msg.value;
            amount0Min = amountTokenMin;
            amount1Min = amountEthMin;
        }

        ( , amount0, amount1) = alphaVault._calcSharesAndAmounts(amount0Desired, amount1Desired);

        // Pull in tokens from sender
        IWETH9(weth).deposit{value: (token0IsWeth ? amount0 : amount1) }();
        if (msg.value >  (token0IsWeth ? amount0 : amount1) ) safeTransferETH(msg.sender, msg.value - (token0IsWeth ? amount0 : amount1));

        if (token0IsWeth) {
            token1.safeTransferFrom(msg.sender, address(this), amount1);
        }
        else { 
            token0.safeTransferFrom(msg.sender, address(this), amount0);
        }
        
        //Deposit in AlphaVault
        (shares, amount0, amount1) = alphaVault.deposit(amount0Desired, amount1Desired, amount0Min, amount1Min, to);
    }
        
    
    function withdrawEth(
        uint256 shares,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(shares > 0, "shares");
        require(to != address(0) && to != address(this) && to != address(alphaVault), "to");

        (amount0, amount1) = alphaVault.withdraw(shares, amount0Min, amount1Min, address(this));
        
        // Push tokens to recipient
        if (token0IsWeth) {
            if (amount1 > 0) token1.safeTransfer(to, amount1);
            if (amount0 > 0) {
                IWETH9(weth).withdraw(amount0);
                safeTransferETH(to, amount0);
            }
        }
        else { 
            if (amount0 > 0) token0.safeTransfer(to, amount0);
            if (amount1 > 0) {
                IWETH9(weth).withdraw(amount1);
                safeTransferETH(to, amount1);
            }
        }
    }

    //TODO: compound and earn fees
    //TODO: deposit eth
    //TODO: checkDeviation
    //TODO: tests - add flashloan test
    function swapDeposit(
        uint256 amount0Desired,
        uint256 amount1Desired,
        address to
        )   
        external
        payable
        nonReentrant
        returns (
            uint256 shares,
            uint256 amount0,
            uint256 amount1
        )
        {
            require(amount0Desired > 0 || amount1Desired > 0, "At least one amount has to be gt 0");
            require(amount0Desired == 0 || amount1Desired == 0, "At least one amount has to be eq 0");

            // Calculate amounts proportional to vault's holdings
            // Ratio is between the values, not quantity, that's why also price is returned
            // Price is later used to compute swap amount
            (int256 amountToSwap, uint256 price, IERC20 tokenDesired) = _getSwapInputs(amount0Desired, amount1Desired);
            // require(uint256(amountToSwap) <= Math.max(amount0Desired, amount1Desired), "amountToSwap gte amountDesired");
             
            // Transfer tokenDesired
            if (tokenDesired == token0) {
                token0.safeTransferFrom(msg.sender, address(this), Math.max(amount0Desired, amount1Desired));
            } else {
                token1.safeTransferFrom(msg.sender, address(this), Math.max(amount0Desired, amount1Desired));
            }

            // TODO: INSERT SLIPPAGE
            // Doing swaps and computing amount swapped and amounts after swaps
            (int256 amount0Swapped, int256 amount1Swapped) = _swap(amountToSwap, uint160(price));
            emit SwapAmount(amount0Desired, amount1Desired, amount0Swapped, amount1Swapped);
            
            amount0Desired = uint256(int256(amount0Desired).sub(amount0Swapped));
            amount1Desired = uint256(int256(amount1Desired).sub(amount1Swapped));
            
            // TODO: compute amount0 and amount1 min now at 0
            (shares, amount0, amount1) = alphaVault.deposit(amount0Desired, 
                                                            amount1Desired, 
                                                            0,
                                                            0, 
                                                            to);
            // (shares, amount0, amount1) = (0,0,0);
            // Return any remaining
            if (amount0Desired.sub(amount0) > 0) token0.safeTransfer(msg.sender, amount0Desired.sub(amount0));
            if (amount1Desired.sub(amount1) > 0) token1.safeTransfer(msg.sender, amount1Desired.sub(amount1));
    }

    function _getSwapInputs(uint256 amount0Desired, 
                            uint256 amount1Desired) 
                            internal 
                            returns(int256 amountToSwap, 
                                    uint256 price, 
                                    IERC20 tokenDesired) {
            (uint256 total0, uint256 total1) = alphaVault.getTotalAmounts();
            
            int24 tick;
            (, tick, , , , , ) = alphaVault.pool().slot0();
            uint160 sqrtPrice = TickMath.getSqrtRatioAtTick(tick);
            
            price = FullMath.mulDiv(uint256(sqrtPrice).mul(uint256(sqrtPrice)), PRECISION, 2**(96 * 2)); //token1 / token0
            uint256 token0in1 = total0.mul(price).div(PRECISION);
            uint256 ratio = token0in1.mul(PRECISION).div(total1.add(token0in1));
            
            // Only one token can be deposited, therefore taking the max and detecting which token 
            // is required for the swap
            uint256 amountTokenDesired = Math.max(amount0Desired, amount1Desired);
            tokenDesired = (amount0Desired > 0 ? token0 : token1);

            // Depending on which token is desired, consider ratio or its inverse
            ratio = (amount0Desired > 0 ? ratio : (PRECISION).sub(ratio)); 

            // Compute swap amount and sign
            // This uses only the ratio, it would be better to use uniswap quoter
            // With quoter and slippage, we can determine exact input for given output
            if (tokenDesired == token0) {
                    amountToSwap = int256(amountTokenDesired.sub((ratio).mul(amountTokenDesired).div(PRECISION)));
                } else {
                    amountToSwap = -int256(amountTokenDesired.sub((ratio).mul(amountTokenDesired).div(PRECISION)));
                }

            emit SwapInputs(amountTokenDesired, amountToSwap, ratio, price);

    }

    /// @dev Callback for Uniswap V3 pool.
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        require(msg.sender == address(alphaVault.pool()));
        if (amount0Delta > 0) token0.safeTransfer(msg.sender, uint256(amount0Delta));
        if (amount1Delta > 0) token1.safeTransfer(msg.sender, uint256(amount1Delta));
    }

    //TODO : compute slippage
    function _swap(int256 amountToSwap, uint160 sqrtPrice) internal returns(int256 amountSwapped0, int256 amountSwapped1) {
            (int256 amount0, int256 amount1) = alphaVault.pool().swap(
                address(this),
                amountToSwap > 0,
                amountToSwap > 0 ? amountToSwap : -amountToSwap,
                amountToSwap > 0 ? sqrtPrice : TickMath.MAX_SQRT_RATIO - 1,
                //? sqrtPriceLimitX96 < slot0Start.sqrtPriceX96 && sqrtPriceLimitX96 > TickMath.MIN_SQRT_RATIO
                //: sqrtPriceLimitX96 > slot0Start.sqrtPriceX96 && sqrtPriceLimitX96 < TickMath.MAX_SQRT_RATIO, 
                ""
            );
            amountSwapped0 = amount0;
            amountSwapped1 = amount1;

    }



    /// @notice Transfers ETH to the recipient address
    /// @dev Fails with `STE`
    /// @param to The destination of the transfer
    /// @param value The value to be transferred
    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}("");
        require(success, 'STE');
    }

    fallback() external payable {
    }

}













