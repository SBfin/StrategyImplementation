pragma solidity 0.7.6;
pragma abicoder v2;

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
    address public governance;
    address public pendingGovernance;

    //Any data passed through by the caller via the IUniswapV3PoolActions#swap call
    struct SwapCallbackData {
        address pool;
    }

    struct VaultData {
        AlphaVault vault;
        IUniswapV3Pool pool;
        IERC20 token0;
        IERC20 token1;
        bool token0IsWeth;
    }

    constructor(address wethAddress) {
            weth = IWETH9(wethAddress);
            governance = msg.sender;
    }

    function depositEth(
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountEthMin,
        address to,
        address vault
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

        VaultData memory vaultData = _getVault(vault);
        
        // Approve tokens from this contract to the vault if not already approved
        if (vaultData.token0.allowance(address(this), vault) == 0 && vaultData.token1.allowance(address(this), vault) == 0) {
                bool approve0 = vaultData.token0.approve(vault,  2**256 - 1);
                bool approve1 = vaultData.token1.approve(vault,  2**256 - 1);
                require(approve0 && approve1, "approval");
            }

        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount1Min;
        uint256 amount0Min;

        if (vaultData.token0IsWeth) {
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

        ( , amount0, amount1) = vaultData.vault._calcSharesAndAmounts(amount0Desired, amount1Desired);

        // Pull in tokens from sender
        weth.deposit{value: (vaultData.token0IsWeth ? amount0 : amount1) }();
        if (msg.value >  (vaultData.token0IsWeth ? amount0 : amount1) ) safeTransferETH(msg.sender, msg.value - (vaultData.token0IsWeth ? amount0 : amount1));

        if (vaultData.token0IsWeth) {
            vaultData.token1.safeTransferFrom(msg.sender, address(this), amount1);
        }
        else { 
            vaultData.token0.safeTransferFrom(msg.sender, address(this), amount0);
        }

        //Deposit in AlphaVault
        (shares, amount0, amount1) = vaultData.vault.deposit(amount0Desired, amount1Desired, amount0Min, amount1Min, to);
    }   
        
    
    function withdrawEth(
        uint256 shares,
        uint256 amount0Min,
        uint256 amount1Min,
        address to,
        address vault
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        
        VaultData memory vaultData = _getVault(vault);
        
        require(shares > 0, "shares");

        (amount0, amount1) = vaultData.vault.withdraw(shares, amount0Min, amount1Min, address(this));
        
        // Push tokens to recipient
        if (vaultData.token0IsWeth) {
            if (amount1 > 0) vaultData.token1.safeTransfer(to, amount1);
            if (amount0 > 0) {
                weth.withdraw(amount0);
                safeTransferETH(to, amount0);
            }
        }
        else { 
            if (amount0 > 0) vaultData.token0.safeTransfer(to, amount0);
            if (amount1 > 0) {
                weth.withdraw(amount1);
                safeTransferETH(to, amount1);
            }
        }
    }

    function swapDeposit(
        uint256 amount0Desired,
        uint256 amount1Desired,
        int256  amountToSwap,
        uint160 sqrtPriceLimitX96,
        address to,
        address vault
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
            require(amount0Desired > 0 || amount1Desired > 0 || msg.value > 0, "gt 0");
            require(amountToSwap != 0, "ne 0");
            
            VaultData memory vaultData = _getVault(vault);

            // User cannot deposit both ETH and WETH
            if (msg.value > 0) {
                if (vaultData.token0IsWeth) {
                    require(amount0Desired == 0, "WETH and ETH");
                    amount0Desired = msg.value; 
                } else {
                    require(amount1Desired == 0, "WETH and ETH");
                    amount1Desired = msg.value;
                }
            }

            // Approve tokens from this contract to the vault if not already approved
            if (vaultData.token0.allowance(address(this), vault) == 0 && vaultData.token1.allowance(address(this), vault) == 0) {
                bool approve0 = vaultData.token0.approve(vault,  2**256 - 1);
                bool approve1 = vaultData.token1.approve(vault,  2**256 - 1);
                require(approve0 && approve1);
            }

            // Transfer tokensDesired
            // Pull in tokens from sender
            _pull(amount0Desired, amount1Desired, msg.value, vaultData);
            
            (int256 amount0Swapped, int256 amount1Swapped) = _swap(amountToSwap, sqrtPriceLimitX96, vaultData);
            
            // amount desired post swap = amountDesired + amountSwapped
            // this should be very close to amount held in vault
            amount0Desired = uint256(int256(amount0Desired).sub(amount0Swapped));
            amount1Desired = uint256(int256(amount1Desired).sub(amount1Swapped));
            (shares, amount0, amount1) = vaultData.vault.deposit(amount0Desired,
                                                            amount1Desired,
                                                            0,
                                                            0,
                                                            to);
            // Return any remaining
            if (Math.max(amount0Desired.sub(amount0), amount1Desired.sub(amount1)) > 0) _giveBack(amount0Desired.sub(amount0), amount1Desired.sub(amount1), msg.value, vaultData);
    }

    function _pull(uint256 amount0Desired, uint256 amount1Desired, uint256 value, VaultData memory vaultData) internal {
        
        if (value > 0) {
                weth.deposit{value: (vaultData.token0IsWeth ? amount0Desired : amount1Desired) }();
                if (vaultData.token0IsWeth) {
                    if (amount1Desired > 0) vaultData.token1.safeTransferFrom(msg.sender, address(this), amount1Desired);
                    } else { 
                    if (amount0Desired > 0) vaultData.token0.safeTransferFrom(msg.sender, address(this), amount0Desired);
                }
            } else {
                if (amount1Desired > 0) vaultData.token1.safeTransferFrom(msg.sender, address(this), amount1Desired);
                if (amount0Desired > 0) vaultData.token0.safeTransferFrom(msg.sender, address(this), amount0Desired);
            }

    }

    function _giveBack(uint256 diff0, uint256 diff1, uint256 value, VaultData memory vaultData) internal {
            
            if (value > 0) {
                if (value >  (vaultData.token0IsWeth ? diff0 : diff1 )) {
                    weth.withdraw(vaultData.token0IsWeth ? diff0 : diff1);
                    safeTransferETH(msg.sender, (vaultData.token0IsWeth ? diff0 : diff1));
                } else {
                    (vaultData.token0IsWeth ? vaultData.token1 : vaultData.token0).safeTransfer(msg.sender, Math.max(diff0, diff1));
                }
                
            } else {
                if (diff0 > 0) vaultData.token0.safeTransfer(msg.sender, diff0);
                if (diff1 > 0) vaultData.token1.safeTransfer(msg.sender, diff1);
            }

    }


    function _getVault(address vault) internal returns(VaultData memory vaultData) {
        AlphaVault alphaVault = AlphaVault(vault);
        IUniswapV3Pool pool = alphaVault.pool();
        IERC20 token0 = IERC20(pool.token0());
        IERC20 token1 = IERC20(pool.token1());
        bool token0IsWeth = address(token0) == address(weth);
        // Saving vaultData in memory        
        vaultData = VaultData(alphaVault, pool, token0, token1, token0IsWeth);
    }

    
    /// @dev Callback for Uniswap V3 pool.
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external override {
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        IUniswapV3Pool pool = IUniswapV3Pool(data.pool);
        if (amount0Delta > 0) IERC20(pool.token0()).safeTransfer(msg.sender, uint256(amount0Delta));
        if (amount1Delta > 0) IERC20(pool.token1()).safeTransfer(msg.sender, uint256(amount1Delta));
    }

    function _swap(int256 amountToSwap,
                    uint160 sqrtPriceLimitX96,
                    VaultData memory vaultData) 
                    internal 
                    returns(int256 amount0Swapped, int256 amount1Swapped) 
            {
                (amount0Swapped, amount1Swapped) = vaultData.pool.swap(address(this),
                                                                    amountToSwap > 0,
                                                                    amountToSwap > 0 ? amountToSwap : -amountToSwap,
                                                                    sqrtPriceLimitX96,
                                                                    abi.encode(SwapCallbackData({pool :  address(vaultData.pool)})));
            }


    /**
     * @notice Removes tokens accidentally sent to this contract.
     */
    function sweep(
        IERC20 token,
        uint256 amount,
        address to,
        address vault   
    ) external onlyGovernance {
        VaultData memory vaultData = _getVault(vault);
        require(token != vaultData.token0 && token != vaultData.token1, "token");
        token.safeTransfer(to, amount);
    }

     /**
     * @notice Governance address is not updated until the new governance
     * address has called `acceptGovernance()` to accept this responsibility.
     */
    function setGovernance(address _governance) external onlyGovernance {
        pendingGovernance = _governance;
    }

    /**
     * @notice `setGovernance()` should be called by the existing governance
     * address prior to calling this function.
     */
    function acceptGovernance() external {
        require(msg.sender == pendingGovernance, "pendingGovernance");
        governance = msg.sender;
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

    modifier onlyGovernance {
        require(msg.sender == governance, "governance");
        _;
    }

}













