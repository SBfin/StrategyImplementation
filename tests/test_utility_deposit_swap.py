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
    ratio = (total0*price / (total0*price + total1))
    # Single token case
    if amount0 * amount1 == 0:
        amountToSwap = (1 - ratio)*amount0 if amount0 > amount1 else (ratio*amount1)
        token0Sell = 1 if amount0 > amount1 else -1
    else:
        token0Sell = 1 if amount0*total1 > amount1*total0 else -1
        (_, amount0In, amount1In) = vault._calcSharesAndAmounts(amount0, amount1)
        amountInExcess = max(amount0 - amount0In, amount1 - amount1In)
        amountToSwap = (amount0 - ratio*amountInExcess) if token0Sell > 0 else (amount1 - (1 - ratio)*amountInExcess)
    
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
    [[1e10, 1e5, 0], [0, 1e15, 0], [1e15, 0, 0], [1e20, 1e1, 0], [0, 0, 1e12]]
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

    # Adding liquidity to the pool to insure swap amount is consistent (price does not change materially)
    max_tick = 120000 // 60 * 60
    router.mint(pool, -max_tick, max_tick, 1e19, {"from": gov})

    # Saving state before swap deposit
    total0, total1 = vault.getTotalAmounts()
    price = (getPrice(pool))
    print("total0 ", total0)
    print("total1 ", total1)

    # Compute amountToSwap according to frontend logic
    amountToSwap = compute_amount_to_swap(max(amount0Desired, msg_value), amount1Desired, pool, vault)
    print("amountToSwap ", amountToSwap)
    
    # If I sell, price limit is a lower bound
    sqrtPriceX96 = pool.slot0()[0]
    slippage = 0.10
    if amountToSwap > 0:
        sqrtPriceLimitX96 = int(sqrtPriceX96 - sqrtPriceX96*slippage)
    else:
        sqrtPriceLimitX96 = int(sqrtPriceX96 + sqrtPriceX96*slippage)

    # If I buy, price limit is an upper bound
    tx = utility.swapDeposit(amount0Desired, amount1Desired, amountToSwap, sqrtPriceLimitX96, recipient, vault.address, {"from" : user, "value" : msg_value})
    print(tx.events)
    shares, amount0, amount1 = tx.return_value

    # Check some amounts and shares have been taken
    assert shares  > 0
    assert amount0 > 0
    assert amount1 > 0
    print("amount0 ", amount0)
    print("amount1 ", amount1)
    
    value_deposited = amount0Desired*price + amount1Desired if msg_value == 0 else msg_value*price + amount1Desired
    value_in_vault  = total0*price + total1
    
    # % shares
    shares_minted   = value_deposited / (value_in_vault + value_deposited)

    # Check received some shares
    total0, total1 = vault.getTotalAmounts()
    
    # Check received shares
    assert shares == vault.balanceOf(recipient) > 0
    
    # Check amount received is correct according to frontend logic
    assert shares / (shares_minted * vault.totalSupply()) ==  approx(1, rel=(slippage)) 

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

    with reverts("gt 0"):
        utility.swapDeposit(0, 0, 1e18, 0, recipient, vault.address, {"from": user})

    with reverts("ne 0"):
        utility.swapDeposit(1e16, 1e12, 0, 0, recipient, vault.address, {"from": user})

    with reverts("WETH and ETH"):
        utility.swapDeposit(1e16, 1e12, 1e1, 0, recipient, vault.address, {"from": user, "value" : 1e15})
