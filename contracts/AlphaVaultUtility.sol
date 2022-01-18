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
import "./libraries/LowGasSafeMath.sol";

contract AlphaVaultUtility is
    ReentrancyGuard,
    IUniswapV3SwapCallback
    {

    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using LowGasSafeMath for uint160;

    IWETH9 public immutable weth;
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
        uint sqrtPriceX96,
        uint sqrtPriceLimitX96
    );


    constructor(address _alphaVault, address wethAddress) {
            alphaVault = AlphaVault(_alphaVault);
            weth = IWETH9(wethAddress);
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
        weth.deposit{value: (token0IsWeth ? amount0 : amount1) }();
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
                weth.withdraw(amount0);
                safeTransferETH(to, amount0);
            }
        }
        else { 
            if (amount0 > 0) token0.safeTransfer(to, amount0);
            if (amount1 > 0) {
                weth.withdraw(amount1);
                safeTransferETH(to, amount1);
            }
        }
    }


    function swapDeposit(
        uint256 amount0Desired,
        uint256 amount1Desired,
        address to,
        uint24  priceImpactPercentage
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
            // User can invest ETH, WETH or the other token
            require(amount0Desired > 0 || amount1Desired > 0 || msg.value > 0, "At least one amount has to be gt 0");
            // Prevents slippage to be > 50%
            require(priceImpactPercentage < 1e6 && priceImpactPercentage > 0, "PIP");

            // User cannot deposit both ETH and WETH
            if (msg.value > 0) {
                if (token0IsWeth) {
                    require(amount0Desired == 0, "Both WETH and ETH");
                    amount0Desired = msg.value; 
                } else {
                    require(amount1Desired == 0, "Both WETH and ETH");
                    amount1Desired = msg.value;
                }
            }

            // Calculate amounts proportional to vault's holdings
            // Ratio is between the values, not quantity, that's why also price is returned
            // Price is later used to compute swap amount
            (int256 amountToSwap, uint160 sqrtPriceLimitX96) = _getSwapInputs(amount0Desired, amount1Desired, priceImpactPercentage);
             
            // Transfer tokensDesired
            // Pull in tokens from sender
            _pull(amount0Desired, amount1Desired, msg.value);
            
            (int256 amount0Swapped, int256 amount1Swapped) = _swap(amountToSwap, sqrtPriceLimitX96);
            emit SwapAmount(amount0Desired, amount1Desired, amount0Swapped, amount1Swapped);
            
            // amount desired post swap = amountDesired + amountSwapped
            // this should be very close to amount held in vault
            amount0Desired = uint256(int256(amount0Desired).sub(amount0Swapped));
            amount1Desired = uint256(int256(amount1Desired).sub(amount1Swapped));
            (shares, amount0, amount1) = alphaVault.deposit(amount0Desired,
                                                            amount1Desired,
                                                            0,
                                                            0,
                                                            to);
            // Return any remaining
            if (Math.max(amount0Desired.sub(amount0), amount1Desired.sub(amount1)) > 0) _giveBack(amount0Desired.sub(amount0), amount1Desired.sub(amount1), msg.value);
    }

    function _getSwapInputs(uint256 amount0Desired, uint256 amount1Desired, uint24 priceImpactPercentage) 
                            internal 
                            returns(int256 amountToSwap, 
                                    uint160 sqrtPriceLimitX96) {
            
            // Retrieve value token0 / total value and sqrtPrice
            (uint256 ratio, uint160 sqrtPriceX96) = _getRatioAndSqrtPriceX96();
            
            // Both tokens can be deposited, therefore taking the max and detecting which token 
            uint256 amountTokenDesired;
            // True if excess of token0
            bool token0Desired;
            if (amount0Desired.mul(amount1Desired) > 0 ) {
                ( , uint256 amount0, uint256 amount1) = alphaVault._calcSharesAndAmounts(amount0Desired, amount1Desired);
                amountTokenDesired = Math.max(amount0Desired.sub(amount0), amount1Desired.sub(amount1));
                token0Desired = amount0Desired.sub(amount0) > amount1Desired.sub(amount1) ? true : false;
            } else {
                amountTokenDesired = Math.max(amount0Desired, amount1Desired);
                token0Desired = amount0Desired > amount1Desired ? true : false;
            }

            // Depending on which token is desired, consider ratio or its inverse
            ratio = (token0Desired ? ratio : (PRECISION).sub(ratio)); 

            // Compute swap amount and sign
            if (token0Desired) {
                    amountToSwap = int256(amountTokenDesired.sub((ratio).mul(amountTokenDesired).div(PRECISION)));
                } else {
                    amountToSwap = -int256(amountTokenDesired.sub((ratio).mul(amountTokenDesired).div(PRECISION)));
            }

            // Compute slippage
            uint160 exactSqrtPriceImpact = sqrtPriceX96.mul160(priceImpactPercentage / 2) / 1e6;
            sqrtPriceLimitX96 = (token0Desired) ?  sqrtPriceX96.sub160(exactSqrtPriceImpact) : sqrtPriceX96.add160(exactSqrtPriceImpact);

            emit SwapInputs(amountTokenDesired, amountToSwap, ratio, sqrtPriceX96, sqrtPriceLimitX96);
    }

    function _getRatioAndSqrtPriceX96() internal view returns(uint256 ratio, uint160 sqrtPriceX96) {
            (uint256 total0, uint256 total1) = alphaVault.getTotalAmounts();
            require(total0 > 0 && total1 > 0, "total0 && total1");
            (sqrtPriceX96, , , , , , ) = alphaVault.pool().slot0();
            uint256 price = FullMath.mulDiv(uint256(sqrtPriceX96).mul(uint256(sqrtPriceX96)), PRECISION, 2**(96 * 2)); //token1 / token0
            uint256 token0in1 = total0.mul(price).div(PRECISION);
            ratio = token0in1.mul(PRECISION).div(total1.add(token0in1));
            }

    function _pull(uint256 amount0Desired, uint256 amount1Desired, uint256 value) internal {
        
        if (value > 0) {
                weth.deposit{value: (token0IsWeth ? amount0Desired : amount1Desired) }();
                if (token0IsWeth) {
                    if (amount1Desired > 0) token1.safeTransferFrom(msg.sender, address(this), amount1Desired);
                    } else { 
                    if (amount0Desired > 0) token0.safeTransferFrom(msg.sender, address(this), amount0Desired);
                }
            } else {
                if (amount1Desired > 0) token1.safeTransferFrom(msg.sender, address(this), amount1Desired);
                if (amount0Desired > 0) token0.safeTransferFrom(msg.sender, address(this), amount0Desired);
            }

    }

    function _giveBack(uint256 diff0, uint256 diff1, uint256 value) internal {
            
            if (value > 0) {
                if (value >  (token0IsWeth ? diff0 : diff1 )) {
                    weth.withdraw(token0IsWeth ? diff0 : diff1);
                    safeTransferETH(msg.sender, (token0IsWeth ? diff0 : diff1));
                } else {
                    (token0IsWeth ? token1 : token0).safeTransfer(msg.sender, Math.max(diff0, diff1));
                }
                
            } else {
                if (diff0 > 0) token0.safeTransfer(msg.sender, diff0);
                if (diff1 > 0) token1.safeTransfer(msg.sender, diff1);
            }

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
    function _swap(int256 amountToSwap, uint160 sqrtPriceLimitX96) public returns(int256 amountSwapped0, int256 amountSwapped1) {
            
            (int256 amount0, int256 amount1) = alphaVault.pool().swap(
                address(this),
                amountToSwap > 0,
                amountToSwap > 0 ? amountToSwap : -amountToSwap,
                sqrtPriceLimitX96,
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













