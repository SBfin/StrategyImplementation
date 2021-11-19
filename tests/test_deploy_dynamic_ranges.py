from brownie import reverts


def test_constructor(DynamicRangesStrategy, vault, gov, keeper):
    strategy = gov.deploy(DynamicRangesStrategy, vault, 2400, 1200, 500, 600, keeper)
    assert strategy.vault() == vault
    assert strategy.pool() == vault.pool()
    assert strategy.baseThreshold() == 2400
    assert strategy.limitThreshold() == 1200
    assert strategy.maxTwapDeviation() == 500
    assert strategy.twapDuration() == 600
    assert strategy.keeper() == keeper


def test_constructor_checks(DynamicRangesStrategy, vault, gov, keeper):
    with reverts("threshold % tickSpacing"):
        gov.deploy(DynamicRangesStrategy, vault, 2401, 1200, 500, 600, keeper)

    with reverts("threshold % tickSpacing"):
        gov.deploy(DynamicRangesStrategy, vault, 2400, 1201, 500, 600, keeper)

    with reverts("threshold > 0"):
        gov.deploy(DynamicRangesStrategy, vault, 0, 1200, 500, 600, keeper)

    with reverts("threshold > 0"):
        gov.deploy(DynamicRangesStrategy, vault, 2400, 0, 500, 600, keeper)

    with reverts("threshold too high"):
        gov.deploy(DynamicRangesStrategy, vault, 887280, 1200, 500, 600, keeper)

    with reverts("threshold too high"):
        gov.deploy(DynamicRangesStrategy, vault, 2400, 887280, 500, 600, keeper)

    with reverts("maxTwapDeviation"):
        gov.deploy(DynamicRangesStrategy, vault, 2400, 1200, -1, 600, keeper)

    with reverts("twapDuration"):
        gov.deploy(DynamicRangesStrategy, vault, 2400, 1200, 500, 0, keeper)


def test_set_base_threshold(DynamicRangesStrategy, vault, gov, keeper):
    strategy = gov.deploy(DynamicRangesStrategy, vault, 2400, 1200, 500, 600, keeper)
    baseThreshold = strategy.baseThreshold()

    strategy.setBaseThreshold(baseThreshold + 1200, { "from": keeper })

    assert(baseThreshold + 1200 == strategy.baseThreshold())

    newStrategy = gov.deploy(DynamicRangesStrategy, vault, 2400, 1200, 500, 600, keeper)
    noKeeperAddress = '0xaaB5a17c0d9d09632F013d8b5E2353A77710dDc1'

    with reverts("keeper"):
        newStrategy.setBaseThreshold(baseThreshold + 1200, { "from": noKeeperAddress })

    with reverts("threshold % tickSpacing"):
        strategy.setBaseThreshold(baseThreshold + 1201, { "from": keeper })

    with reverts("threshold > 0"):
        strategy.setBaseThreshold(-1, { "from": keeper })

    with reverts("threshold too high"):
        strategy.setBaseThreshold(887280, { "from": keeper })




def test_set_limit_threshold(DynamicRangesStrategy, vault, gov, keeper):
    strategy = gov.deploy(DynamicRangesStrategy, vault, 2400, 1200, 500, 600, keeper)
    limitThreshold = strategy.limitThreshold()

    strategy.setLimitThreshold(limitThreshold + 1200, { "from": keeper })

    assert(limitThreshold + 1200 == strategy.limitThreshold())

    newStrategy = gov.deploy(DynamicRangesStrategy, vault, 2400, 1200, 500, 600, keeper)
    noKeeperAddress = '0xaaB5a17c0d9d09632F013d8b5E2353A77710dDc1'

    with reverts("keeper"):
        newStrategy.setLimitThreshold(limitThreshold + 1200, { "from": noKeeperAddress })

    with reverts("threshold % tickSpacing"):
        strategy.setLimitThreshold(limitThreshold + 1201, { "from": keeper })

    with reverts("threshold > 0"):
        strategy.setLimitThreshold(-1, { "from": keeper })

    with reverts("threshold too high"):
        strategy.setLimitThreshold(887280, { "from": keeper })
