from brownie import reverts


def test_constructor(AlphaVaultUtility, gov, tokens, wethToken):
    utility = gov.deploy(AlphaVaultUtility, tokens[wethToken])
    assert utility.weth() == tokens[wethToken]

    
