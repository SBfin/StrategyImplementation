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


# Uniswap v3 factory on Mainnet
FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984"

PROTOCOL_FEE = 10000
MAX_TOTAL_SUPPLY = 1e32

BASE_THRESHOLD = 3600
LIMIT_THRESHOLD = 1200
PERIOD = 43200  # 12 hours
MIN_TICK_MOVE = 0
MAX_TWAP_DEVIATION = 100  # 1%
TWAP_DURATION = 60  # 60 seconds


def main():
    deployer = accounts[0]
    UniswapV3Core = project.load("Uniswap/uniswap-v3-core@1.0.0")

    gas_strategy = ExponentialScalingStrategy("10000 wei", "1000 gwei")

    eth = deployer.deploy(MockToken, "ETH", "ETH", 18)
    usdc = deployer.deploy(MockToken, "USDC", "USDC", 6)
    #eth = Contract('0x2150e3B32dD7201a73dEc2D7E92f3Ef511c26103')
    #usdc = Contract('0x6951b5Bd815043E3F842c1b026b0Fa888Cc2DD85')


    eth.mint(deployer, 100 * 1e18, {"from": deployer })
    usdc.mint(deployer, 100000 * 1e6, {"from": deployer })

    factory = UniswapV3Core.interface.IUniswapV3Factory(FACTORY)
    print(factory.address)
    factory.createPool(eth, usdc, 3000, { "from": deployer, "gas_price": gas_strategy })
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
        100, {"from": deployer, "gas_price": gas_strategy}
    )

    router = deployer.deploy(TestRouter)
    #router = Contract("0xa3B53dDCd2E3fC28e8E130288F2aBD8d5EE37472")
    MockToken.at(eth).approve(
        router, 1 << 255, {"from": deployer, "gas_price": gas_strategy}
    )
    MockToken.at(usdc).approve(
        router, 1 << 255, {"from": deployer, "gas_price": gas_strategy}
    )
    time.sleep(15)

    max_tick = 887272 // 60 * 60
    router.mint(
        pool, -max_tick, max_tick, 1e14, {"from": deployer, "gas_price": gas_strategy}
    )

    #vault = Contract("0xe692Cf21B12e0B2717C4bF647F9768Fa58861c8b")
    vault = deployer.deploy(
        AlphaVault,
        pool,
        PROTOCOL_FEE,
        MAX_TOTAL_SUPPLY,
        gas_price=gas_strategy,
    )

    #strategy = Contract("")
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
        gas_price=gas_strategy,
    )
    vault.setStrategy(strategy, {"from": deployer, "gas_price": gas_strategy})

    print(f"Vault address: {vault.address}")
    print(f"Strategy address: {strategy.address}")
    print(f"Router address: {router.address}")
    
