from brownie import chain, reverts, ZERO_ADDRESS
import pytest
from pytest import approx
import random
from brownie.network.gas.strategies import GasNowScalingStrategy, ExponentialScalingStrategy

# test deposit swap
# Base case
# 1) Both tokens in vault
# 2) Depositing only one token
# 3) User does not invest eth
# Note that swapping modifies total amounts in the pools
# Depositing [1, 0] --> this will fail as this quantity cannot be swapped to reach the ratio (amount0Desired or amount1Desired will be 0)
@pytest.mark.parametrize(
    "amount0Desired,amount1Desired, msg_value",
    [[0, 1e15, 0], [1e18, 0, 0], [1e12, 1e16, 0], [0, 0, 1e12]]
)
def test_deposit(
    utility,
    vaultAfterPriceMove,
    tokens,
    gov,
    user,
    recipient,
    amount0Desired,
    amount1Desired,
    msg_value
):

    vault = vaultAfterPriceMove

    # Saving state before swap deposit
    balance0 = user.balance() 
    balance1 = user.balance() 
    totalSupply = vault.totalSupply()
    total0, total1 = vault.getTotalAmounts()

    print(balance0)
    print(balance1)

    # Swap deposit
    tx = utility.swapDeposit(amount0Desired, amount1Desired, recipient, 1e5, {"from" : user, "value" : msg_value})
    shares, amount0, amount1 = tx.return_value
    print(tx.events)

    # Check event
    dct = [dct for dct in tx.events["Deposit"] if "sender" in dct][0]
    assert dct == {
        "sender": utility,
        "to": recipient,
        "shares": shares,
        "amount0": amount0,
        "amount1": amount1,
    }
    