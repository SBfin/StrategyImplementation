from brownie import (
    accounts,
    project,
    MockToken,
    AlphaVault,
    PassiveStrategy,
    DynamicRangesStrategy,
    TestRouter,
    ZERO_ADDRESS,
    Contract,
    chain
)
import time
from math import floor, sqrt
from brownie.network.gas.strategies import GasNowScalingStrategy, ExponentialScalingStrategy
from brownie.network import gas_price, gas_limit

# Uniswap v3 factory on Arbitrum testnet
FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984"

PROTOCOL_FEE = 10000
MAX_TOTAL_SUPPLY = 1e32

BASE_THRESHOLD = 3600
LIMIT_THRESHOLD = 1200
PERIOD = 43200  # 12 hours
MIN_TICK_MOVE = 0
MAX_TWAP_DEVIATION = 100  # 1%
TWAP_DURATION = 60  # 60 seconds

# Set this to make the first deposit, in this example we deposit 1 token0 = 4K token1
DEPOSIT_TOKEN_1 = 1e18
DEPOSIT_TOKEN_2 = 4000e6


def main():
    deployer = accounts.load("deployer", "none")
    UniswapV3Core = project.load("Uniswap/v3-core@1.0.0")

    gas_strategy = ExponentialScalingStrategy("0.1 gwei", "10000 gwei")
    gas_price(gas_strategy)
    gas_limit(1000000000)

    eth = deployer.deploy(MockToken, "ETH", "ETH", 18)
    usdc = deployer.deploy(MockToken, "USDC", "USDC", 6)

    eth.mint(deployer, 1000000 * 1e18, {"from": deployer})
    usdc.mint(deployer, 4000 * 1000000 * 1e6, {"from": deployer})

    factory = UniswapV3Core.interface.IUniswapV3Factory(FACTORY)
    print("Factory: ", factory.address)

    factory.createPool(eth, usdc, 3000, {"from": deployer})

    time.sleep(15)

    pool = UniswapV3Core.interface.IUniswapV3Pool(factory.getPool(eth, usdc, 3000))

    inverse = pool.token0() == usdc
    price = 1e18 / 4000e6 if inverse else 4000e6 / 1e18

    # Set ETH/DAI price to 4000
    pool.initialize(
        floor(sqrt(price) * (1 << 96)), {"from": deployer}
    )

    # Increase cardinality so TWAP works
    pool.increaseObservationCardinalityNext(
        100, {"from": deployer}
    )

    router = TestRouter.deploy({"from": deployer})

    eth.approve(
        router, 1 << 255, {"from": deployer}
    )
    usdc.approve(
        router, 1 << 255, {"from": deployer}
    )

    # Add some liquidity over whole range
    max_tick = 887272 // 60 * 60
    router.mint(
        pool, -max_tick, max_tick, 1e14, {"from": deployer}
    )

    vault = deployer.deploy(
        AlphaVault,
        pool,
        PROTOCOL_FEE,
        MAX_TOTAL_SUPPLY
    )

    strategy = deployer.deploy(
        DynamicRangesStrategy,
        vault,
        BASE_THRESHOLD,
        LIMIT_THRESHOLD,
        MAX_TWAP_DEVIATION,
        TWAP_DURATION,
        deployer
    )

    vault.setStrategy(strategy, {"from": deployer})

    print("Doing the first deposit to set the price ratio..")
    eth.approve(vault, DEPOSIT_TOKEN_1, {"from": deployer})
    usdc.approve(vault, DEPOSIT_TOKEN_2, {"from": deployer})
    tx = vault.deposit(DEPOSIT_TOKEN_1, DEPOSIT_TOKEN_2, 0, 0, deployer, {"from": deployer})

    print(f"Vault address: {vault.address}")
    print(f"Strategy address: {strategy.address}")
    print(f"Deposited transaction: {tx}")
