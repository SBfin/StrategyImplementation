from brownie import (
    accounts,
    project,
    OrbitVault,
    DynamicRangesStrategy,
    TestRouter,
    Contract,
    ZERO_ADDRESS,
    interface
)
from brownie.network.gas.strategies import ExponentialScalingStrategy
from math import floor, sqrt
import time
from math import floor, sqrt
from brownie.network.gas.strategies import GasNowScalingStrategy, ExponentialScalingStrategy
from brownie.network import gas_price, gas_limit
from brownie.network import priority_fee

KEEPER = "0xffa9FDa3050007645945e38E72B5a3dB1414A59b"

# Uniswap v3 factory on Ropsten
FACTORY="0x1F98431c8aD98523631AE4a59f267346ea31F984"

PROTOCOL_FEE = 10000
MAX_TOTAL_SUPPLY = 1e32

BASE_THRESHOLD = 3600 #1.43
LIMIT_THRESHOLD = 1200 #1.12
PERIOD = 43200  # 12 hours
MIN_TICK_MOVE = 0
MAX_TWAP_DEVIATION = 100  # 1%
TWAP_DURATION = 60  # 60 seconds

# Set this to make the first deposit, in this example we deposit 1 token0 = 4K token1
DEPOSIT_TOKEN_1 = 0.01e18
DEPOSIT_TOKEN_2 = 40e6

def main():
    deployer = accounts.load("deployer")

    print(deployer.balance())

    UniswapV3Core = project.load("Uniswap/v3-core@1.0.0")

    priority_fee("auto")

    eth = interface.IERC20("0xc778417e063141139fce010982780140aa0cd5ab")
    usdc = interface.IERC20("0x07865c6E87B9F70255377e024ace6630C1Eaa37F")
    
    factory = UniswapV3Core.interface.IUniswapV3Factory(FACTORY)

    pool = UniswapV3Core.interface.IUniswapV3Pool(factory.getPool(eth, usdc, 500))
    print("pool address: ", pool)

    vault = OrbitVault.deploy(
        pool,
        PROTOCOL_FEE,
        MAX_TOTAL_SUPPLY,
        eth,
        {"from": deployer},
        publish_source = True
    )
    
    strategy = deployer.deploy(
        DynamicRangesStrategy,
        vault,
        BASE_THRESHOLD,
        LIMIT_THRESHOLD,
        MAX_TWAP_DEVIATION,
        TWAP_DURATION,
        deployer,
        publish_source = True
    )

    vault.setStrategy(strategy, {"from": deployer})
    strategy.setKeeper(KEEPER, {"from": deployer})

    print("Doing the first deposit to set the price ratio..")
    eth.approve(vault, DEPOSIT_TOKEN_1, {"from": deployer})
    usdc.approve(vault, DEPOSIT_TOKEN_2, {"from": deployer})
    tx = vault.deposit(DEPOSIT_TOKEN_1, DEPOSIT_TOKEN_2, 0, 0, deployer, {"from": deployer})

    print(f"Vault address: {vault.address}")
    print(f"Strategy address: {strategy.address}")
    print(f"Deposited transaction: {tx}")
    