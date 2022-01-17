from brownie import chain, reverts, ZERO_ADDRESS
import pytest
from pytest import approx
import random
from brownie.network.gas.strategies import GasNowScalingStrategy, ExponentialScalingStrategy

def getPrice(pool):
    sqrtPrice = pool.slot0()[0] / (1 << 96)
    return sqrtPrice ** 2

# test deposit swap
# Base case
# 1) Both tokens in vault
# 2) Depositing only one token
# Note that swapping modifies total amounts in the pools
# Depositing [1, 0] --> this will fail as this quantity cannot be swapped to reach the ratio (amount0Desired or amount1Desired will be 0)
@pytest.mark.parametrize(
    "amount0Desired,amount1Desired, msg_value",
    [[0, 1e15, 0], [1e18, 0, 0], [1e20, 1e1, 0], [0, 0, 1e12], [0, 1e5, 1e10]]
)
def test_deposit(
    utility,
    router,
    vaultAfterPriceMove,
    tokens,
    pool,
    gov,
    user,
    recipient,
    amount0Desired,
    amount1Desired,
    msg_value
):

    # Adding liquidity to the pool to insure swap amount is consistent
    max_tick = 400000 // 60 * 60
    router.mint(pool, -max_tick, max_tick, 1e19, {"from": gov})

    vault = vaultAfterPriceMove
    slippage_param = 1e5

    # Saving state before swap deposit
    total0, total1 = vault.getTotalAmounts()

    print("total0 ", total0)
    print("total1 ", total1)

    # Get price
    price = getPrice(pool)
    print(price)

    # Swap deposit
    tx = utility.swapDeposit(amount0Desired, amount1Desired, recipient, slippage_param, {"from" : user, "value" : msg_value})
    shares, amount0, amount1 = tx.return_value
    print(tx.events)
    value_deposited = amount0Desired*price + amount1Desired if msg_value == 0 else msg_value*price + amount1Desired
    value_in_vault  = total0*price + total1
    
    # % shares
    shares_minted   = value_deposited / (value_in_vault + value_deposited)

    # Check received some shares
    # Shares post deposit
    # 1e-6 is the conversion factor between slippage on sqrt price and slippage on price
    total0, total1 = vault.getTotalAmounts()
    assert shares == vault.balanceOf(recipient) > 0
    assert shares / (shares_minted * vault.totalSupply()) ==  approx(1, rel=(1e-6*slippage_param)) 

    # Check paid right amount of tokens or eths
    # Balance after - balance before

    # Check event
    dct = [dct for dct in tx.events["Deposit"] if "sender" in dct][0]
    assert dct == {
        "sender": utility,
        "to": recipient,
        "shares": shares,
        "amount0": amount0,
        "amount1": amount1,
    }
    