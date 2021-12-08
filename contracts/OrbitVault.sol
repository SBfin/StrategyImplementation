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

contract OrbitVault is 
    IVault,
    IUniswapV3MintCallback,
    IUniswapV3SwapCallback,
    ERC20,
    ReentrancyGuard,
    AlphaVault
{   
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public weth;


    constructor(address _pool,
        uint256 _protocolFee,
        uint256 _maxTotalSupply) 

        AlphaVault(_pool,
        _protocolFee,
        _maxTotalSupply) 
        
        {}

    event EthRefund(
        address indexed to,
        uint256 amount
    );

    function depositEth(
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
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
        require(amount0Desired > 0 || amount1Desired > 0, "amount0Desired or amount1Desired");
        if (address(token0) == weth) {require(msg.value >= amount0Desired, "amount0Desired greater than value");}
        else {require(msg.value >= amount1Desired, "amount1Desired greater than value");}
        require(to != address(0) && to != address(this), "to");

        // Poke positions so vault's current holdings are up-to-date
        _poke(baseLower, baseUpper);
        _poke(limitLower, limitUpper);

        // Calculate amounts proportional to vault's holdings
        (shares, amount0, amount1) = _calcSharesAndAmounts(amount0Desired, amount1Desired);
        require(shares > 0, "shares");
        require(amount0 >= amount0Min, "amount0Min");
        require(amount1 >= amount1Min, "amount1Min");

        // Pull in tokens from sender
        if (address(token0) != weth)
            {if (amount0 > 0) token0.safeTransferFrom(msg.sender, address(this), amount0);}
        else if (amount0 >= 0) {
                // Convert amount in weth if positive amount
                if (amount0 > 0) IWETH9(weth).deposit{value: amount0}();
                // Refund any amount left
                if (msg.value > amount0) refundETH();
                }

        if (address(token1) != weth)
            {if (amount1 > 0) token1.safeTransferFrom(msg.sender, address(this), amount1);}
        else if (amount1 >= 0) {
                // Convert amount in weth if positive amount
                if (amount1 > 0) IWETH9(weth).deposit{value: amount1}();
                // Refund any amount left
                if (msg.value > amount1) refundETH();
                }

        


        // Mint shares to recipient
        _mint(to, shares);
        emit Deposit(msg.sender, to, shares, amount0, amount1);
        require(totalSupply() <= maxTotalSupply, "maxTotalSupply");

    }

    function refundETH() internal {
        if (address(this).balance > 0) safeTransferETH(msg.sender, address(this).balance);
        emit EthRefund(msg.sender, address(this).balance);
    }

    /// @notice Transfers ETH to the recipient address
    /// @dev Fails with `STE`
    /// @param to The destination of the transfer
    /// @param value The value to be transferred
    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'STE');
    }

    function setAddressWeth(address _address) external onlyGovernance {
        weth = _address;
    }

}













