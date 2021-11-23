from brownie import reverts


def test_constructor(SwapStrategy, vault, gov, keeper):
    strategy = gov.deploy(SwapStrategy, vault, 2400, 1200, 500, 600, keeper)
    assert strategy.vault() == vault
    assert strategy.pool() == vault.pool()
    assert strategy.baseThreshold() == 2400
    assert strategy.limitThreshold() == 1200
    assert strategy.maxTwapDeviation() == 500
    assert strategy.twapDuration() == 600
    assert strategy.keeper() == keeper


def test_constructor_checks(SwapStrategy, vault, gov, keeper):
    with reverts("threshold % tickSpacing"):
        gov.deploy(SwapStrategy, vault, 2401, 1200, 500, 600, keeper)

    with reverts("threshold % tickSpacing"):
        gov.deploy(SwapStrategy, vault, 2400, 1201, 500, 600, keeper)

    with reverts("threshold > 0"):
        gov.deploy(SwapStrategy, vault, 0, 1200, 500, 600, keeper)

    with reverts("threshold > 0"):
        gov.deploy(SwapStrategy, vault, 2400, 0, 500, 600, keeper)

    with reverts("threshold too high"):
        gov.deploy(SwapStrategy, vault, 887280, 1200, 500, 600, keeper)

    with reverts("threshold too high"):
        gov.deploy(SwapStrategy, vault, 2400, 887280, 500, 600, keeper)

    with reverts("maxTwapDeviation"):
        gov.deploy(SwapStrategy, vault, 2400, 1200, -1, 600, keeper)

    with reverts("twapDuration"):
        gov.deploy(SwapStrategy, vault, 2400, 1200, 500, 0, keeper)

def test_rebalance(SwapStrategy, vault, gov, keeper, user):
    strategy = gov.deploy(SwapStrategy, vault, 2400, 1200, 500, 600, keeper)
    vault.setStrategy(strategy, { "from": gov })

    vault.deposit(1e16, 1e18, 0, 0, user, { "from": user })

    swapAmount = vault.getBalance0()
    minSQRTPrice = vault.getBalance1()


    strategy.rebalance(swapAmount, minSQRTPrice, { "from": keeper })