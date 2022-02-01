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
    print("pool slot 0 ", pool.slot0()[0])
    ratio = (total0*price / (total0*price + total1))
    print("ratio ", ratio)
    # Single token case
    amountToSwap = (1 / price)*((total1*amount0 - total0*amount1) / (total0 + total1/price))
    return amountToSwap


# test deposit swap
# Base case
# 1) Both tokens in vault
# 2) Depositing multiple tokens
# 3) Depositing with WETH / ETH
# Depositing [1, 0] --> this will fail as this quantity cannot be swapped to reach the ratio (amount0Desired or amount1Desired will be 0)
# Low quantity swaps
@pytest.mark.parametrize(
    "amount0Desired,amount1Desired, msg_value",
    [[1e18, 0, 0], [0, 1e10, 0], [0, 0, 1e18], [1e4, 1e12, 0], [0, 0, 1e12], [0, 1e7, 1e10]]
)
def test_swapDeposit(
    utility,
    router,
    vaultAfterPriceMove,
    tokens,
    wethToken,
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
    max_tick = 240000 // 60 * 60
    router.mint(pool, -max_tick, max_tick, 1e16, {"from": gov})

    # Saving state before swap deposit
    total0, total1 = vault.getTotalAmounts()
    balance0Before   = tokens[0].balanceOf(user)
    balance1Before   = tokens[1].balanceOf(user)
    balanceEthBefore = user.balance()

    price = (getPrice(pool))
    print("total0 ", total0)
    print("total1 ", total1)

    # Compute amountToSwap according to frontend logic
    amountToSwap = compute_amount_to_swap(max(amount0Desired, msg_value), amount1Desired, pool, vault)
    
    # If I sell, price limit is a lower bound
    sqrtPriceX96 = pool.slot0()[0]
    slippage = 0.2
    if amountToSwap > 0:
        sqrtPriceLimitX96 = int(sqrtPriceX96 - sqrtPriceX96*slippage)
    else:
        sqrtPriceLimitX96 = int(sqrtPriceX96 + sqrtPriceX96*slippage)

    # compute amount to receive 
    amountToReceive = -amountToSwap*price if amountToSwap > 0 else -amountToSwap * (1/price)
    print("amountToSwap ", amountToSwap)
    print("amountToReceive ", amountToReceive)

    tx = utility.swapDeposit(amount0Desired, amount1Desired, amountToSwap, sqrtPriceLimitX96, recipient, vault.address, {"from" : user, "value" : msg_value})
    shares, amount0, amount1 = tx.return_value
    price = (getPrice(pool))
    print("price post swap ", price)

    # Check some amounts and shares have been taken
    assert shares  > 0
    assert vault.balanceOf(recipient) == shares
    assert amount0 > 0
    assert amount1 > 0
    print("amount0 ", amount0)
    print("amount1 ", amount1)
    
    print(tx.events["Swap"])

    # Swap executed correctly
    # Amount received from swap close to amountToReceive
    dct = [dct for dct in tx.events["Swap"]][0]
    assert dct["sender"] == utility.address
    assert dct["recipient"] == utility.address
    if amountToSwap > 0:
        assert dct["amount0"] == amountToSwap
        assert dct["amount1"] / amountToReceive == approx(1, rel = slippage)
    else:
        assert dct["amount0"] / amountToReceive == approx(-1, rel = slippage)
        assert dct["amount1"] == -amountToSwap

    # Amount desired post swap --> what is left in utility after swapping
    amount0DesiredSwap = amount0Desired - dct["amount0"]
    amount1DesiredSwap = amount1Desired - dct["amount1"]

    # Amount - amount0DesiredSwap should be the amount returned to user
    remainder0 = amount0DesiredSwap - amount0
    remainder1 = amount1DesiredSwap - amount1
    print("remainder0 ", remainder0)
    print("remainder1 ", remainder1)

    print("remainder0 / amount0DesiredSwap ", remainder0 / amount0DesiredSwap)
    print("remainder1 / amount1DesiredSwap ", remainder1 / amount1DesiredSwap)

    # Check user balance after swap is correct
    balance0After = tokens[0].balanceOf(user)
    balance1After = tokens[1].balanceOf(user)
    balanceEthAfter = user.balance()
     
    if msg_value == 0:
        assert balance0After / (balance0Before - amount0Desired + remainder0) == approx(1, rel = slippage)
        assert balance1After / (balance1Before - amount1Desired + remainder1) == approx(1, rel = slippage)
    else:
        token0isWeth = tokens[0] == tokens[wethToken]
        amountEthDesired = amount0Desired if token0isWeth else amount1Desired
        remainderEth = remainder0 if token0isWeth else remainder1
        assert balanceEthAfter / (balanceEthBefore - amountEthDesired + remainderEth) == approx(1, rel = slippage)

    """
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
    """
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
