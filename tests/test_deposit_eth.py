from brownie import chain, reverts, ZERO_ADDRESS
import pytest
from pytest import approx
import random
from collections import OrderedDict

@pytest.mark.parametrize(
    "amount0Desired,amount1Desired",
    [ [0, 1e15] , [1, 0], [1e18, 0], [0, 1e10], [1e4, 1e10], [1e18, 1e10]],
)
def test_initial_deposit(
    vault,
    tokens,
    gov,
    user,
    recipient,
    amount0Desired,
    amount1Desired,
):
    wethtoken = int(bool(random.getrandbits(1)))
    print(wethtoken)
    # Deposit
    tx = vault.setAddressWeth(tokens[wethtoken], {"from" : gov})

    balance0 = user.balance() if (tokens[0] == tokens[wethtoken]) else tokens[0].balanceOf(user)
    balance1 = user.balance() if (tokens[1] == tokens[wethtoken]) else tokens[1].balanceOf(user)
    
    value = amount0Desired if (tokens[0] == tokens[wethtoken]) else amount1Desired
    amountTokenDesired = amount0Desired if (tokens[0] != tokens[wethtoken]) else amount1Desired
    tx = vault.depositEth(amountTokenDesired, 0, 0, recipient, {"from": user, "value" : value})
    shares, amount0, amount1 = tx.return_value

    # Check amounts are same as inputs
    assert amount0 == amount0Desired
    assert amount1 == amount1Desired
    
    # Check received right number of shares
    assert shares == vault.balanceOf(recipient) > 0

    # Check paid right amount of tokens
    balance0New = user.balance() if (tokens[0] == tokens[wethtoken]) else tokens[0].balanceOf(user)
    balance1New = user.balance() if (tokens[1] == tokens[wethtoken]) else tokens[1].balanceOf(user)
    
    assert amount0 == balance0 - balance0New
    assert amount1 == balance1 - balance1New

    # Check event
    print(tx.events)
    dct = [dct for dct in tx.events["Deposit"] if "sender" in dct][0]
    assert dct == {
        "sender": user,
        "to": recipient,
        "shares": shares,
        "amount0": amount0,
        "amount1": amount1,
    }

@pytest.mark.parametrize(
    "amount0Desired,amount1Desired",
    [[1, 1e18], [1e18, 1], [1e4, 1e18], [1e18, 1e18]]
)
def test_deposit_eth(
    vaultAfterPriceMove,
    tokens,
    getPositions,
    gov,
    user,
    recipient,
    amount0Desired,
    amount1Desired,
):
    vault = vaultAfterPriceMove
    wethtoken = int(bool(random.getrandbits(1)))
    print(wethtoken)
    # set address
    tx = vault.setAddressWeth(tokens[wethtoken], {"from" : gov})

    balance0 = user.balance() if (tokens[0] == tokens[wethtoken]) else tokens[0].balanceOf(user)
    balance1 = user.balance() if (tokens[1] == tokens[wethtoken]) else tokens[1].balanceOf(user)    
    
    totalSupply = vault.totalSupply()
    total0, total1 = vault.getTotalAmounts()
    govShares = vault.balanceOf(gov)

    # Deposit
    value = amount0Desired if (tokens[0] == tokens[wethtoken]) else amount1Desired
    amountTokenDesired = amount0Desired if (tokens[0] != tokens[wethtoken]) else amount1Desired
    tx = vault.depositEth(amountTokenDesired, 0, 0, recipient, {"from": user, "value" : value})
    shares, amount0, amount1 = tx.return_value

    # Check amounts don't exceed desired
    assert amount0 <= amount0Desired
    assert amount1 <= amount1Desired

    # Check received right number of shares
    assert shares == vault.balanceOf(recipient) > 0

    # Check paid right amount of tokens
    balance0New = user.balance() if (tokens[0] == tokens[wethtoken]) else tokens[0].balanceOf(user)
    balance1New = user.balance() if (tokens[1] == tokens[wethtoken]) else tokens[1].balanceOf(user)
 
    assert amount0 == balance0 - balance0New
    assert amount1 == balance1 - balance1New

    # Check one amount is tight
    assert approx(amount0) == amount0Desired or approx(amount1) == amount1Desired

    # Check total amounts are in proportion
    total0After, total1After = vault.getTotalAmounts()
 
    totalSupplyAfter = vault.totalSupply()

    assert approx(total0 * total1After) == total1 * total0After
    assert approx(total0 * totalSupplyAfter) == total0After * totalSupply
    assert approx(total1 * totalSupplyAfter) == total1After * totalSupply

    # Check event
    dct = [dct for dct in tx.events["Deposit"] if "sender" in dct][0]
    assert dct == {
        "sender": user,
        "to": recipient,
        "shares": shares,
        "amount0": amount0,
        "amount1": amount1,
    }

@pytest.mark.parametrize(
    "amount0Desired,amount1Desired",
    [[1e4, 1e18], [1e18, 1e18]],
)
def test_deposit_when_vault_only_has_token0(
    vaultOnlyWithToken0,
    pool,
    tokens,
    getPositions,
    gov,
    user,
    recipient,
    amount0Desired,
    amount1Desired,
):
    vault = vaultOnlyWithToken0

    wethtoken = int(bool(random.getrandbits(1)))
    print(wethtoken)
    # set address
    tx = vault.setAddressWeth(tokens[wethtoken], {"from" : gov})
    
    vault.withdraw(vault.balanceOf(gov) // 2, 0, 0, gov, {"from": gov})

    balance0 = user.balance() if (tokens[0] == tokens[wethtoken]) else tokens[0].balanceOf(user)
    balance1 = user.balance() if (tokens[1] == tokens[wethtoken]) else tokens[1].balanceOf(user)    

    totalSupply = vault.totalSupply()
    total0, total1 = vault.getTotalAmounts()

    # Deposit
    value = amount0Desired if (tokens[0] == tokens[wethtoken]) else amount1Desired
    amountTokenDesired = amount0Desired if (tokens[0] != tokens[wethtoken]) else amount1Desired
    tx = vault.depositEth(amountTokenDesired, 0, 0, recipient, {"from": user, "value" : value})
    shares, amount0, amount1 = tx.return_value

    # Check amounts don't exceed desired
    assert amount0 <= amount0Desired
    assert amount1 <= amount1Desired

    # Check received right number of shares
    assert shares == vault.balanceOf(recipient) > 0

    # Check paid right amount of tokens
    balance0New = user.balance() if (tokens[0] == tokens[wethtoken]) else tokens[0].balanceOf(user)
    balance1New = user.balance() if (tokens[1] == tokens[wethtoken]) else tokens[1].balanceOf(user)
 
    assert amount0 == balance0 - balance0New
    assert amount1 == balance1 - balance1New

    # Check paid mainly token0
    assert amount0 > 0
    assert approx(amount1 / amount0, abs=1e-3) == 0

    # Check amount is tight
    assert approx(amount0) == amount0Desired

    # Check total amounts are in proportion
    total0After, total1After = vault.getTotalAmounts()
    totalSupplyAfter = vault.totalSupply()
    assert approx(total0 * totalSupplyAfter) == total0After * totalSupply


@pytest.mark.parametrize(
    "amount0Desired,amount1Desired",
    [[1e4, 1e18], [1e18, 1e18]],
)
def test_deposit_when_vault_only_has_token1(
    vaultOnlyWithToken1,
    pool,
    tokens,
    getPositions,
    gov,
    user,
    recipient,
    amount0Desired,
    amount1Desired,
):
    vault = vaultOnlyWithToken1

    wethtoken = int(bool(random.getrandbits(1)))
    print(wethtoken)
    # set address
    tx = vault.setAddressWeth(tokens[wethtoken], {"from" : gov})
    
    vault.withdraw(vault.balanceOf(gov) // 2, 0, 0, gov, {"from": gov})

    balance0 = user.balance() if (tokens[0] == tokens[wethtoken]) else tokens[0].balanceOf(user)
    balance1 = user.balance() if (tokens[1] == tokens[wethtoken]) else tokens[1].balanceOf(user)    

    totalSupply = vault.totalSupply()
    total0, total1 = vault.getTotalAmounts()

    # Deposit
    amountTokenDesired = amount0Desired if (tokens[0] != tokens[wethtoken]) else amount1Desired
    value = amount0Desired if (tokens[0] == tokens[wethtoken]) else amount1Desired
    tx = vault.depositEth(amountTokenDesired, 0, 0, recipient, {"from": user, "value" : value})
    shares, amount0, amount1 = tx.return_value

    # Check amounts don't exceed desired
    assert amount0 <= amount0Desired
    assert amount1 <= amount1Desired

    # Check received right number of shares
    assert shares == vault.balanceOf(recipient) > 0

    # Check paid right amount of tokens
    balance0New = user.balance() if (tokens[0] == tokens[wethtoken]) else tokens[0].balanceOf(user)
    balance1New = user.balance() if (tokens[1] == tokens[wethtoken]) else tokens[1].balanceOf(user)
 
    assert amount0 == balance0 - balance0New
    assert amount1 == balance1 - balance1New

    # Check paid mainly token1
    assert amount1 > 0
    assert approx(amount0 / amount1, abs=1e-3) == 0

    # Check amount is tight
    assert approx(amount1) == amount1Desired

    # Check total amounts are in proportion
    total0After, total1After = vault.getTotalAmounts()
    totalSupplyAfter = vault.totalSupply()
    assert approx(total1 * totalSupplyAfter) == total1After * totalSupply


def test_deposit_checks(vault, user, tokens, gov):

    vault.setAddressWeth(tokens[1], {"from" : gov})

    with reverts("amount0Desired or amount1Desired"):
        vault.deposit(0, 0, 0, 0, user, {"from": user})
    
    with reverts("to"):
        vault.deposit(1e8, 1e8, 0, 0, ZERO_ADDRESS, {"from": user})

    with reverts("to"):
        vault.deposit(1e8, 1e8, 0, 0, vault, {"from": user})

    with reverts("amount0Min"):
        vault.deposit(1e8, 0, 2e8, 0, user, {"from": user})
    
    with reverts("amount1Min"):
        vault.deposit(0, 1e8, 0, 2e8, user, {"from": user})

    with reverts("maxTotalSupply"):
        vault.deposit(1e8, 200e18, 0, 0, user, {"from": user})

    with reverts("amountTokenDesired or value"):
        vault.depositEth(0, 0, 0, user, {"from": user, "value" : 0})  

    with reverts("to"):
        vault.depositEth(1e8, 0, 0, vault, {"from": user, "value" : 1e8})



