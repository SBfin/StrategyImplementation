from brownie import (
    accounts,
    project,
    MockToken,
    MockWETH9,
    DepositEth,
    AlphaVault,
    PassiveStrategy,
    TestRouter,
    ZERO_ADDRESS,
    Contract
)
from brownie.network.gas.strategies import GasNowScalingStrategy, ExponentialScalingStrategy
from math import floor, sqrt
import time

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
    UniswapV3Core = project.load("Uniswap/v3-core@1.0.0")

    gas_strategy = ExponentialScalingStrategy("10000 wei", "1000 gwei")

    weth = deployer.deploy(MockWETH9)
    usdc = deployer.deploy(MockToken, "USDC", "USDC", 6)

    #eth.mint(deployer, 100 * 1e18, {"from": deployer })
    usdc.mint(deployer, 100000 * 1e6, {"from": deployer })

    factory = deployer.deploy(UniswapV3Core.UniswapV3Factory)
    print(factory.address)
    tx = factory.createPool(usdc, weth, 3000, { "from": deployer, "gas_price": gas_strategy })
    pool = UniswapV3Core.interface.IUniswapV3Pool(tx.return_value)
    
    vault = deployer.deploy(
        AlphaVault,
        pool,
        PROTOCOL_FEE,
        MAX_TOTAL_SUPPLY,
        gas_price=gas_strategy,
    )

    depositContract = deployer.deploy(
        DepositEth,
        vault,
        weth.address
    )

    depositContract.depositEth(
        1000e6,
        999e6,
        9e17,
        deployer,
        { "from": deployer, "value": 1e18})

    print("weth " + str(weth.balanceOf(depositContract)))
    print("usdc " + str(usdc.balanceOf(depositContract)))
    
    