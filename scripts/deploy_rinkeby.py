from brownie import (
    accounts,
    project,
    MockToken,
    AlphaVault,
    PassiveStrategy,
    TestRouter,
    ZERO_ADDRESS,
    Contract
)
from brownie.network.gas.strategies import GasNowScalingStrategy, ExponentialScalingStrategy
from math import floor, sqrt
import time


# Uniswap v3 factory on Rinkeby
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
    deployer = accounts.load("deployer")
    UniswapV3Core = project.load("Uniswap/uniswap-v3-core@1.0.0")

    gas_strategy = ExponentialScalingStrategy("10000 wei", "1000 gwei")

    eth = deployer.deploy(MockToken, "ETH", "ETH", 18)
    usdc = deployer.deploy(MockToken, "USDC", "USDC", 6)


    eth.mint(deployer, 100 * 1e18, {"from": deployer })
    usdc.mint(deployer, 100000 * 1e6, {"from": deployer })

    factory = UniswapV3Core.interface.IUniswapV3Factory(FACTORY)

    factory.createPool(eth, usdc, 3000, { "from": deployer })
    time.sleep(15)
    
    pool = UniswapV3Core.interface.IUniswapV3Pool(factory.getPool(eth, usdc, 3000))

    
    inverse = pool.token0() == usdc
    price = 1e18 / 2000e6 if inverse else 2000e6 / 1e18
    

    # Set ETH/USDC price to 2000
    
    pool.initialize(
        floor(sqrt(price) * (1 << 96)), {"from": deployer }
    )

    # Increase cardinality so TWAP works
    
    pool.increaseObservationCardinalityNext(
        100, {"from": deployer }
    )

    router = deployer.deploy(TestRouter)
    
    MockToken.at(eth).approve(
        router, 1 << 255, {"from": deployer }
    )
    MockToken.at(usdc).approve(
        router, 1 << 255, {"from": deployer }
    )

    max_tick = 887272 // 60 * 60
    
    router.mint(
        pool, -max_tick, max_tick, 1e14, {"from": deployer }
    )

    vault = deployer.deploy(
        AlphaVault,
        pool,
        PROTOCOL_FEE,
        MAX_TOTAL_SUPPLY,
        publish_source=True,
        gas_price='10000000000',
    )

    strategy = deployer.deploy(
        PassiveStrategy,
        vault,
        BASE_THRESHOLD,
        LIMIT_THRESHOLD,
        PERIOD,
        MIN_TICK_MOVE,
        MAX_TWAP_DEVIATION,
        TWAP_DURATION,
        deployer,
        publish_source=True,
        gas_price=gas_strategy,
    )
    vault.setStrategy(strategy, {"from": deployer })


    print("Doing the first deposit to set the price ratio..")
    eth.approve(vault, DEPOSIT_TOKEN_1, {"from": deployer})
    usdc.approve(vault, DEPOSIT_TOKEN_2, {"from": deployer})
    tx = vault.deposit(DEPOSIT_TOKEN_1, DEPOSIT_TOKEN_2, 0, 0, deployer, {"from": deployer})
    shares, amount0, amount1 = tx.return_value

    print(f"Vault address: {vault.address}")
    print(f"Strategy address: {strategy.address}")
    print(f"Router address: {router.address}")
    print(f"Deposited token0: {amount0} token1: {amount1} shares: {shares}")
