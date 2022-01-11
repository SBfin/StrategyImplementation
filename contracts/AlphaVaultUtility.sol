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

    address immutable weth;
    AlphaVault public immutable alphaVault;
    bool token0IsWeth;

    constructor(address _alphaVault, address wethAddress) {
            alphaVault = AlphaVault(_alphaVault);
            weth = wethAddress;
            IUniswapV3Pool pool = AlphaVault(_alphaVault).pool();
            token0IsWeth = pool.token0() == wethAddress;
        }

    event EthRefund(
        address indexed to,
        uint256 amount
    );

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
        require(amountTokenDesired > 0 || msg.value > 0, "amountTokenDesired or value");
        require(to != address(0) && to != address(this), "to");

        IERC20 token0 = IERC20(alphaVault.token0());
        IERC20 token1 = IERC20(alphaVault.token1());

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

        // Pull in tokens from sender
        IWETH9(weth).deposit{value: msg.value }();
        if (token0IsWeth) {
            token1.safeTransferFrom(msg.sender, address(this), amount1Desired);
        }
        else { 
            token0.safeTransferFrom(msg.sender, address(this), amount0Desired);
        }

        //Approving amount desired for this contract
        token0.approve(address(alphaVault), amount1Desired);
        token1.approve(address(alphaVault), amount0Desired);
        
        //Deposit in AlphaVault
        (shares, amount0, amount1) = alphaVault.deposit(amount0Desired, amount1Desired, amount0Min, amount1Min, to);

        // Giving back the remainder
        // Notice that only one of the two tokens can be greater than amount desired
        uint256 remainder = Math.max(amount0Desired.sub(amount0) , amount1Desired.sub(amount1));
        if (address(this).balance > 0) {
            IWETH9(weth).withdraw(remainder);
            safeTransferETH(msg.sender, remainder);
            }
        else {
            token0IsWeth ? 
            token1.safeTransferFrom(address(this), msg.sender, remainder) : 
            token0.safeTransferFrom(address(this), msg.sender, remainder);
        }
    }
    /*
    function withdrawEth(
        uint256 shares,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(shares > 0, "shares");
        require(to != address(0) && to != address(this), "to");

        IERC20 token0 = IERC20(alphaVault.token0());
        IERC20 token1 = IERC20(alphaVault.token1());

        (amount0, amount1) = alphaVault.withdraw(shares, amount0Min, amount1Min, to);

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
    }*/

    /// @notice Transfers ETH to the recipient address
    /// @dev Fails with `STE`
    /// @param to The destination of the transfer
    /// @param value The value to be transferred
    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}("");
        require(success, 'STE');
        emit EthRefund(to, value);
    }

    fallback() external payable {
    }

}













