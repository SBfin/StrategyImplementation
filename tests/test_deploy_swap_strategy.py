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

def test_rebalance_negative_amount(SwapStrategy, vault, gov, keeper, user, pool):
    strategy = gov.deploy(SwapStrategy, vault, 2400, 1200, 500, 600, keeper)
    vault.setStrategy(strategy, { "from": gov })

    vault.deposit(1e16, 1e18, 0, 0, user, { "from": user })

    #zeroToOne true allora sto vendendo token0, false sto comprando token0 

    print('Case swapAmount is negative\n\n*************\n')
    swapAmount = -2400
    #minSQRTPrice = int(1.0001 ** (pool.slot0()[1] * 0.5) * (2 ** 96))
    minSQRTPrice = 2 ** 96
    maxSQRTPrice = 2 ** 159
    SQRTPrice = minSQRTPrice if (swapAmount > 0) else maxSQRTPrice
    print('SQRTPrice')
    print(SQRTPrice)

    assert (maxSQRTPrice == SQRTPrice)

    print(swapAmount)
    print('minSQRTPrice')
    print(minSQRTPrice)
    print('tick')
    print(strategy.getTick())
    

    balance0 = vault.getBalance0()
    balance1 = vault.getBalance1()

    print('balance0')
    print(balance0)
    print('balance1')
    print(balance1)

    tx = strategy.rebalance(swapAmount, SQRTPrice, { "from": keeper })
    tx.wait(1)

    newAmount0, newAmount1 = vault.getTotalAmounts()
    print('newAmount0')
    print(newAmount0)
    print('newAmount1')
    print(newAmount1)

    assert(balance0 < newAmount0)
    assert(balance1 > newAmount1)

    newBalance0 = vault.getBalance0()
    newBalance1 = vault.getBalance1()

    print('newBalance0')
    print(newBalance0)
    print('newBalance1')
    print(newBalance1)

    assert newBalance0 != balance0
    assert newBalance1 != balance1

    print('new tick')
    print(strategy.getTick())


    with reverts("threshold > 0"):
        newStrategy = gov.deploy(SwapStrategy, vault, 0, 0, 500, 600, keeper)
        vault.setStrategy(newStrategy, { "from": gov })

        tx = newStrategy.rebalance(swapAmount, SQRTPrice, { "from": keeper })
    

    tx.wait(1)

def test_rebalance_positive_amount(SwapStrategy, vault, gov, keeper, user, pool):
    strategy = gov.deploy(SwapStrategy, vault, 2400, 1200, 500, 600, keeper)
    vault.setStrategy(strategy, { "from": gov })

    vault.deposit(1e16, 1e18, 0, 0, user, { "from": user })

    #zeroToOne true allora sto vendendo token0, false sto comprando token0 

    print('case swapAmount is positive\n\n\n**************\n')

    swapAmount = 2400
    minSQRTPrice = 2 ** 96
    maxSQRTPrice = 2 ** 159   

    SQRTPrice = minSQRTPrice if (swapAmount > 0) else maxSQRTPrice
    print('SQRTPrice')
    print(SQRTPrice)
    
    assert (minSQRTPrice == SQRTPrice)

    print(swapAmount)
    print('minSQRTPrice')
    print(minSQRTPrice)
    print('tick')
    print(strategy.getTick())

    balance0 = vault.getBalance0()
    balance1 = vault.getBalance1()

    print('balance0')
    print(balance0)
    print('balance1')
    print(balance1)

    tx = strategy.rebalance(swapAmount, SQRTPrice, { "from": keeper })
    tx.wait(1)

    newAmount0, newAmount1 = vault.getTotalAmounts()
    print('newAmount0')
    print(newAmount0)
    print('newAmount1')
    print(newAmount1)

    assert(balance0 > newAmount0)
    assert(balance1 < newAmount1)

    newBalance0 = vault.getBalance0()
    newBalance1 = vault.getBalance1()

    print('newBalance0')
    print(newBalance0)
    print('newBalance1')
    print(newBalance1)

    assert newBalance0 != balance0
    assert newBalance1 != balance1

    print('new tick')
    print(strategy.getTick())