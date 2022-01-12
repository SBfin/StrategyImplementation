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













