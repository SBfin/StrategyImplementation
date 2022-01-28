from brownie import chain, reverts, ZERO_ADDRESS
import pytest
from pytest import approx
import random
from brownie.network.gas.strategies import GasNowScalingStrategy, ExponentialScalingStrategy

def getPrice(pool):
    sqrtPrice = pool.slot0()[0] / (1 << 96)
    return sqrtPrice ** 2

# simulate frontend logic
def compute_amount_to_swap(amount0, amount1, pool, vault):
    total0, total1 = vault.getTotalAmounts()
    price = getPrice(pool)
    ratio = total0*price / (total0*price + total1)
    # Single token case
    if amount0 * amount1 == 0:
        amountToSwap = ratio*max(amount0, amount1) if amount0 > amount1 else (1 - ratio)*max(amount0, amount1)
        token0Sell = 1 if amount0 > amount1 else -1
    else:
        token0Sell = 1 if amount0*total1 > amount1*total0 else -1
        percAmountToSwap = (max(amount1*total0, amount0*total1) - min(amount1*total0, amount0*total1)) / max(amount1*total0, amount0*total1)
        amountToSwap = (amount1 if token0Sell>0 else amount0) * percAmountToSwap
    return int(amountToSwap*token0Sell)


# test deposit swap
# Base case
# 1) Both tokens in vault
# 2) Depositing multiple tokens
# 3) Depositing with WETH / ETH
# Depositing [1, 0] --> this will fail as this quantity cannot be swapped to reach the ratio (amount0Desired or amount1Desired will be 0)
# Low quantity swaps
@pytest.mark.parametrize(
    "amount0Desired,amount1Desired, msg_value",
    [[0, 1e5, 1e10], [0, 1e15, 0], [1e18, 0, 0], [1e20, 1e1, 0], [0, 0, 1e12]]
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

    # Saving state before swap deposit
    amountToSwap = compute_amount_to_swap(max(amount0Desired, msg_value), amount1Desired, pool, vault)
    print(amountToSwap)
    #depositRatio = amount0Desired / amount1Desired
    sqrtPrice = pool.slot0()[0]
    # ex 1589326461698169059132978687000000
    # If I sell, price limit is a lower bound
    slippage = 0.05
    if amountToSwap > 0:
        sqrtPriceLimitX96 = int(sqrtPrice - sqrtPrice*slippage)
    else:
        sqrtPriceLimitX96 = int(sqrtPrice + sqrtPrice*slippage)

    # If I buy, price limit is an upper bound
    tx = utility.swapDeposit(amount0Desired, amount1Desired, amountToSwap, sqrtPriceLimitX96, recipient, vault.address, {"from" : user, "value" : msg_value})
    shares, amount0, amount1 = tx.return_value
    
    # Check event
    dct = [dct for dct in tx.events["Deposit"] if "sender" in dct][0]
    assert dct == {
        "sender": utility,
        "to": recipient,
        "shares": shares,
        "amount0": amount0,
        "amount1": amount1,
    }
"""
def test_deposit_checks(vault, user, recipient, utility):
    tx = vault.deposit(1e8, 1e10, 0, 0, user, {"from": user})
    shares, _, _ = tx.return_value

    with reverts("At least one amount has to be gt 0"):
        utility.swapDeposit(0, 0, recipient, 1e4, {"from": user})

    with reverts("PIP"):
        utility.swapDeposit(0, 1e2, recipient, 1e6+1,  {"from": user})

    with reverts("Both WETH and ETH"):
        utility.swapDeposit(1e4, 0, recipient, 1e3, {"from" : user, "value" : 1e2})

"""