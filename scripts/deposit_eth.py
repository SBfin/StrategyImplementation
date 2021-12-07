from brownie import (
    accounts,
    project,
    MockToken,
    MockWeth,
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

    
    usdc = deployer.deploy(MockToken, "USDC", "USDC", 6)
    weth = deployer.deploy(MockWeth)

    weth.deposit({"from": deployer, "value" : 1e18})
    usdc.mint(deployer, 100000 * 1e6, {"from": deployer })

    factory = deployer.deploy(UniswapV3Core.UniswapV3Factory)
    print(factory.address)
    tx = factory.createPool(weth, usdc, 3000, { "from": deployer, "gas_price": gas_strategy })
    pool = UniswapV3Core.interface.IUniswapV3Pool(tx.return_value)
    
    vault = deployer.deploy(
        AlphaVault,
        pool,
        PROTOCOL_FEE,
        MAX_TOTAL_SUPPLY,
        gas_price=gas_strategy,
    )

    weth.approve(vault, 1e30, {"from" : deployer})
    usdc.approve(vault, 1e24, {"from" : deployer})

    print("vault token 0 : " + str(vault.token0()))
    print("vault token 1 : " + str(vault.token1()))
    print("usdc address : " + str(usdc.address))
    print("weth address : " + str(weth.address))
    print("weth " + str(weth.balanceOf(deployer)))
    print("usdc " + str(usdc.balanceOf(deployer)))

    vault.deposit(1e6,
        1e18,
        0,
        0,
        deployer, 
        {"from" : deployer})
    
    print("weth " + str(weth.balanceOf(deployer)))
    print("usdc " + str(usdc.balanceOf(deployer)))
    print("shares in deposit " + str(vault.balanceOf(deployer)))
    print("shares in deployer  " + str(vault.balanceOf(deployer)))
    
    #Deposit ETH
    print("vault token 0 : " + str(vault.token0()))
    print("vault token 1 : " + str(vault.token1()))
    print("usdc address : " + str(usdc.address))
    print("weth address : " + str(weth.address))
    print("deployer address : " + str(deployer.address))
    print("vault address : " + str(vault.address))
    print("eth " + str(deployer.balance()))
    print("weth " + str(weth.balanceOf(deployer)))
    print("usdc " + str(usdc.balanceOf(deployer)))

    weth.approve(vault, 1e30, {"from" : deployer})
    usdc.approve(vault, 1e24, {"from" : deployer})

    tx = vault.depositEth(10,
        1e18,
        0,
        0,
        deployer, 
        weth.address,
        {"from" : deployer,
         "value" : 1e18})
    
    print(tx.events)
    print(tx.info())
    print(tx.return_value)
    print(tx.call_trace())
    print("eth " + str(deployer.balance()))
    print("weth user " + str(weth.balanceOf(deployer)))
    print("weth vault " + str(weth.balanceOf(vault)))
    print("usdc " + str(usdc.balanceOf(deployer)))
    print("shares in deposit " + str(vault.balanceOf(deployer)))
    print("shares in deployer  " + str(vault.balanceOf(deployer)))
    