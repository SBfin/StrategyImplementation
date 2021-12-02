from brownie import (
    accounts,
    project,
    MockToken,
    AlphaVault,
    DynamicRangesStrategy,
    TestRouter,
    Contract,
    ZERO_ADDRESS,
)
from brownie.network.gas.strategies import ExponentialScalingStrategy
from math import floor, sqrt
import time
import os
from brownie.network import gas_price

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
DEPOSIT_TOKEN_1 = 1e18
DEPOSIT_TOKEN_2 = 4000e6


def main():
    deployer = accounts.load("6000e057971f9f094145f7f5a088b6a277eb904ec77288ec873aedca9fafcb7f")
    print(deployer)
    UniswapV3Core = project.load("Uniswap/uniswap-v3-core@1.0.0")

    gas_strategy = ExponentialScalingStrategy("10000 wei", "1000 gwei")
    gas_price(gas_strategy)

    eth = MockToken.deploy("ETH", "ETH", "18", { "from": deployer, "gas_price": '4 gwei' })
    dai = MockToken.deploy("DAI", "DAI", "6", { "from": deployer, "gas_price": '4 gwei'  })
    
    eth.mint(deployer, 100 * 1e18, {"from": deployer, "gas_price": '4 gwei'})
    dai.mint(deployer, 100000 * 1e6, {"from": deployer, "gas_price": '4 gwei'})
    
    factory = UniswapV3Core.interface.IUniswapV3Factory(FACTORY)
    
    factory.createPool(eth, dai, 3000, {"from": deployer, "gas_price": '4 gwei'})
    
    time.sleep(15)

    pool = UniswapV3Core.interface.IUniswapV3Pool(factory.getPool(eth, dai, 3000))

    inverse = pool.token0() == dai.address
    price = 1e18 / 2000e6 if inverse else 2000e6 / 1e18

    # Set ETH/DAI price to 2000
    pool.initialize(
        floor(sqrt(price) * (1 << 96)), {"from": deployer, "gas_price": '4 gwei'}
    )

    # Increase cardinality so TWAP works
    pool.increaseObservationCardinalityNext(
        100, {"from": deployer, "gas_price": '4 gwei'}
    )

    router = TestRouter.deploy({"from": deployer, "gas_price": '4 gwei'})
    
    eth.approve(
        router, 1 << 255, {"from": deployer, "gas_price": '4 gwei'}
    )
    dai.approve(
        router, 1 << 255, {"from": deployer, "gas_price": '4 gwei'}
    )

    max_tick = 887272 // 60 * 60 ## 246
    
    router.mint(
        pool, -max_tick, max_tick, 1e14, {"from": deployer, "gas_price": '4 gwei'}
    )

    
    vault = AlphaVault.deploy(
        pool,
        PROTOCOL_FEE,
        MAX_TOTAL_SUPPLY,
        {"from": deployer, "gas_price": '4 gwei'}
    )
    
    
    strategy = deployer.deploy(
        DynamicRangesStrategy,
        vault,
        BASE_THRESHOLD,
        LIMIT_THRESHOLD,
        MAX_TWAP_DEVIATION,
        TWAP_DURATION,
        deployer,
        gas_price='4 gwei'
    )
    
    vault.setStrategy(strategy, {"from": deployer, "gas_price": '4 gwei'})

    print(strategy.baseThreshold())
    print(strategy.limitThreshold())

    strategy.setBaseThreshold(4800, {"from": deployer, "gas_price": '4 gwei'})
    strategy.setLimitThreshold(2400, {"from": deployer, "gas_price": '4 gwei'})
    print(strategy.baseThreshold())
    print(strategy.limitThreshold())

    print("Doing the first deposit to set the price ratio..")
    eth.approve(vault, DEPOSIT_TOKEN_1, {"from": deployer})
    dai.approve(vault, DEPOSIT_TOKEN_2, {"from": deployer})
    tx = vault.deposit(DEPOSIT_TOKEN_1, DEPOSIT_TOKEN_2, 0, 0, deployer, {"from": deployer})
    shares, amount0, amount1 = tx.return_value

    print(f"Vault address: {vault.address}")
    print(f"Strategy address: {strategy.address}")
    print(f"Router address: {router.address}")
    print(f"Deposited token0: {amount0} token1: {amount1} shares: {shares}")
