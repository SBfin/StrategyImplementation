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
    with reverts("threshold % tickSpacin"):
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

# def test_set_base_check(DynamicRangesStrategy, vault, gov, keeper):
# def test_set_limit_check(DynamicRangesStrategy, vault, gov, keeper):
# trigger modifier
