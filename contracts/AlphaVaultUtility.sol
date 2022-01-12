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
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol";
import "@uniswap/v3-periphery/contracts/libraries/PositionKey.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IOrbitVault.sol";
import "./AlphaVault.sol";

contract AlphaVaultUtility is 
    ReentrancyGuard
    {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public immutable weth;
    AlphaVault public immutable alphaVault;
    bool token0IsWeth;
    IERC20 public immutable token0;
    IERC20 public immutable token1;
    uint256 public immutable PRECISION = 1e36;
    
    event SwapAmount(
        uint amount0Desired,
        uint amountToSwap,
        uint amount1Desired,
        uint256 shares,
        uint256 amount0,
        uint256 amount1
    );

    event TokenRatio(
        uint ratio,
        uint token0in1,
        uint price
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
    //TODO: checkDeviation / add chainlink
    //TODO: tests - add flashloan test
    function swapDeposit(
        uint256 amount0Desired,
        uint256 amount1Desired
    )   external
        payable
        nonReentrant
        override
        returns (
            uint256 shares
        )
        {
            require(amount0Desired > 0 || amount1Desired > 0, "At least one amount has to be gt 0");
            require(amount0Desired == 0 || amount1Desired == 0, "At least one amount has to be eq 0");
            
            // Poke positions so vault's current holdings are up-to-date
            // Necessary to consider UNI fees in the total token quantities. This is internal to vault only
            // We could allow this contract to poke vault fees
            alphaVault._poke(baseLower, baseUpper);
            alphaVault._poke(limitLower, limitUpper);

            // Calculate amounts proportional to vault's holdings
            // Ratio is between the values, not quantity, that's why also price is returned
            // Price is later used to compute swap amount
            (uint256 ratio, uint256 price) = _getTokenRatio();
            emit TokenRatio(ratio, price);

            // Define which is the token desired and the ratio or the inverse to compute swap amount
            // Only one token can be deposited, therefore taking the max and detecting which token 
            // is required for the swap
            uint256 amountTokenDesired = Math.max(amount0Desired, amount1Desired);
            IERC20 tokenDesired = (amount0Desired > 0 ? token0 : token1);
            // Depending on which token is desired, consider ratio or its inverse
            ratio = (amount0Desired > 0 ? ratio : (PRECISION).sub(ratio)); 

            // Compute swap amount and sign
            // This uses only the ratio, it would be better to use uniswap quoter
            // With quoter and slippage, we can determine exact input for given output
            int256 amountToSwap;
            if (tokenDesired == token0) {
                    amountToSwap = int256(amountTokenDesired.sub((ratio).mul(amountTokenDesired).div(PRECISION)));
                } else {
                    amountToSwap = -int256(amountTokenDesired.sub((ratio).mul(amountTokenDesired).div(PRECISION)));
                }

            //Transfer tokenDesired
            if (address(tokenDesidered) != address(weth)) {
                tokenDesired.safeTransferFrom(msg.sender, address(this), amountTokenDesired);
            } else {
                require(msg.value == amountTokenDesired);
                IWETH9(weth).deposit{value: amountTokenDesired}();
            }
        
            // TODO: INSERT SLIPPAGE
            // Doing swaps and computing amount swapped and amounts after swaps
            uint160 priceToUse = uint160(price);
            (int256 amount0Swapped, int256 amount1Swapped) = _swap(amountToSwap, priceToUse);
            emit SwapAmount(amount0Desired, amount1Desired, amount0Swapped, amount1Swapped);

            // The result of int256(amount0Desired) - amount0Swapped is always positive
            amount0Desired = uint256(int256(amount0Desired) - amount0Swapped);
            amount1Desired = uint256(int256(amount1Desired) - amount1Swapped);
            
            (shares, amount0, amount1) = _calcSharesAndAmounts(amount0Desired, amount1Desired);
            require(shares > 0, "shares");
            (shares, amount0, amount1) = alphaVault.deposit(amount0Desired, amount1Desired, amount0Min, amount1Min, to);

            // Return any remaining
            if (amount0Desired.sub(amount0)) token0.safeTransferFrom(address(this), msg.sender, amount0Desired.sub(amount0));
            if (amount1Desired.sub(amount1)) token1.safeTransferFrom(address(this), msg.sender, amount1Desired.sub(amount1));

    }

    function _getTokenRatio() internal view returns(uint256 ratio, uint256 token0in1, uint256 price) {
            (uint256 total0, uint256 total1) = alphaVault.getTotalAmounts();
            //no proportion with 0
            
            int24 tick;
            (, tick, , , , , ) = pool.slot0();
            uint160 sqrtPrice = TickMath.getSqrtRatioAtTick(tick);
            
            price = FullMath.mulDiv(uint256(sqrtPrice).mul(uint256(sqrtPrice)), 1e18, 2**(96 * 2)); //token1 / token0
            token0in1 = total0.mul(price).div(1e18);
            ratio = token0in1.mul(1e18).div(total1.add(token0in1));
            
    }

    //TODO : compute slippage
    function _swap(int256 amountToSwap, uint160 sqrtPrice) internal returns(int256 amountSwapped0, int256 amountSwapped1) {
            (int256 amount0, int256 amount1) = pool.swap(
                address(this),
                amountToSwap > 0,
                amountToSwap, //amountToSwap > 0 ? amountToSwap : -amountToSwap,
                sqrtPrice, 
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













