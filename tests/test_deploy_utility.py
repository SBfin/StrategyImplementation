from brownie import reverts


def test_constructor(AlphaVaultUtility, vault, gov, tokens, wethToken):
    utility = gov.deploy(AlphaVaultUtility, vault, tokens[wethToken])
    assert utility.alphaVault() == vault
    assert utility.weth() == tokens[wethToken]


def test_constructor_checks(AlphaVaultUtility, vault, gov, tokens, wethToken):
    utility = gov.deploy(AlphaVaultUtility, vault, tokens[wethToken])
    assert tokens[1].allowance(utility, vault) > (2^256 - 1)
    assert tokens[0].allowance(utility, vault) > (2^256 - 1)
    
