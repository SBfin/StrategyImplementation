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
@pytest.mark.parametrize(
    "amount0Desired,amount1Desired",
    [ [1e15, 0] , [1, 0], [1e18, 0], [0, 1e10] ],
)
def test_deposit(
    utility,
    vaultAfterPriceMove,
    tokens,
    gov,
    user,
    recipient,
    amount0Desired,
    amount1Desired
):

    vault = vaultAfterPriceMove

    # Saving state before swap deposit
    balance0 = user.balance() 
    balance1 = user.balance() 
    totalSupply = vault.totalSupply()
    total0, total1 = vault.getTotalAmounts()
    print("total0 ", total0)
    print("total1 ", total1)

    print(tokens[0].allowance(user, utility.address))
    print(tokens[1].allowance(user, utility.address))

    # Swap deposit
    tx = utility.swapDeposit(amount0Desired, amount1Desired, recipient, {"from" : user})
    shares, amount0, amount1 = tx.return_value
    print(tx.events)


    # Check received right number of shares
    assert shares == vault.balanceOf(recipient) > 0

    # Check paid right amount of tokens
    # So utility has given token back
    assert amount0 == balance0 - tokens[0].balanceOf(user)
    assert amount1 == balance1 - tokens[1].balanceOf(user)

    # Check one amount is tight
    # assert approx(amount0) == amount0Desired or approx(amount1) == amount1Desired

    # Check total amounts are in proportion
    total0After, total1After = vault.getTotalAmounts()
    totalSupplyAfter = vault.totalSupply()

    assert approx(total0 * total1After) == total1 * total0After
    assert approx(total0 * totalSupplyAfter) == total0After * totalSupply
    assert approx(total1 * totalSupplyAfter) == total1After * totalSupply

    # Check event
    dct = [dct for dct in tx.events["Deposit"] if "sender" in dct][0]
    assert dct == {
        "sender": utility,
        "to": recipient,
        "shares": shares,
        "amount0": amount0,
        "amount1": amount1,
    }