// SPDX-License-Identifier: Unlicense

pragma solidity 0.7.6;

import "./AlphaVault.sol";
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

/**
 * @title   Deposit Eth in Alpha
 * @notice  A vault that provides liquidity on Uniswap V3.
 */

contract DepositEth is 
    ReentrancyGuard
{
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    
    AlphaVault public immutable vault;
    address public immutable weth;
    uint256 public amount1Desired;
    
    constructor(
        address _vault,
        address _weth
    )
    {
        vault = AlphaVault(_vault);
        weth = _weth;
    }

    //Eth is token 1
    function depositEth(
        uint256 amount0Desired,
        //uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address to) 
        external
        payable
        nonReentrant
        returns (
            uint256 shares,
            uint256 amount0,
            uint256 amount1
        )
        
        {   
            //Converting user eth to weth
            //Depositing eth in IWETH9 contract
            IWETH9(weth).deposit{value : msg.value}();

            //Amount desired is the weth balance of this contract
            amount1Desired = IWETH9(weth).balanceOf(address(this));

            //Approving amount desired for this contract
            IWETH9(weth).approve(address(this), amount1Desired);
            
            //Pull in token 0
            if (amount0Desired > 0) vault.token0.safeTransferFrom(msg.sender, address(this), amount0Desired);

            //now vault has weth
            vault.deposit(
                amount0Desired,
                amount1Desired,
                amount0Min,
                amount1Min,
                to
            );
        }

}
