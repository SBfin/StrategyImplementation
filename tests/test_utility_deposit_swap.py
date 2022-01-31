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
    price = (getPrice(pool))
    print("price ", price)
    ratio = (total0*price / (total0*price + total1))
    print("ratio ", ratio)
    # Single token case
    if amount0 * amount1 == 0:
        amountToSwap = ratio*max(amount0, amount1) if amount0 > amount1 else ((1 - ratio)*max(amount0, amount1))
        token0Sell = 1 if amount0 > amount1 else -1
    else:
        token0Sell = 1 if amount0*total1 > amount1*total0 else -1
        print("token0Sell ", token0Sell)
        (_, amount0In, amount1In) = vault._calcSharesAndAmounts(amount0, amount1)
        amountInExcess = max(amount0 - amount0In, amount1 - amount1In)
        print("amountInExcess ", amountInExcess)
        amountToSwap = (ratio*amountInExcess) if amount0 > amount1 else ((1 - ratio)*amountInExcess)
        print("amountToSwap ", amountToSwap)
    return round(amountToSwap*token0Sell, 0)


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
def test_swapDeposit(
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


def test_deposit_checks(vault, user, recipient, utility):
    tx = vault.deposit(1e8, 1e10, 0, 0, user, {"from": user})
    shares, _, _ = tx.return_value

    with reverts("gt 0"):
        utility.swapDeposit(0, 0, 1e18, 0, recipient, vault.address, {"from": user})

    with reverts("ne 0"):
        utility.swapDeposit(1e16, 1e12, 0, 0, recipient, vault.address, {"from": user})

    with reverts("WETH and ETH"):
        utility.swapDeposit(1e16, 1e12, 1e1, 0, recipient, vault.address, {"from": user, "value" : 1e15})
