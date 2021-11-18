import { InjectedConnector } from '@web3-react/injected-connector'
//import { NetworkConnector } from '@web3-react/network-connector'
import { useState, useEffect } from 'react'

export const MetaMask = new InjectedConnector({ supportedNetworks: [1, 3, 4, 5, 42] })

const contracts = {
  1337: {"vault": "0x724Ca58E1e6e64BFB1E15d7Eec0fe1E5f581c7bD", "eth": "0xE7eD6747FaC5360f88a2EFC03E00d25789F69291", "dai": "0x6951b5Bd815043E3F842c1b026b0Fa888Cc2DD85"}, //mainnet-fork
  3: {"vault": "0x130c973Bbe11CBc5BAE094a45710CDE4Bebb8438", "eth": "0xc778417e063141139fce010982780140aa0cd5ab", "dai": "0xaD6D458402F60fD3Bd25163575031ACDce07538D"}, // Ropsten
  69: {"vault": "0xa919F8Dd481dE4050F660738c0052a17d62c1d09", "eth": "0x7Dd703927F7BD4972b78F64A43A48aC5e9185954", "dai": "0xA6d0aE178b75b5BECfC909Aa408611cbc1a30170"}, // Optimism Kovan
}

export function ContractAddress(name) {
  const [result, setResult] = useState()
  useEffect(async () => {
    const chainId = parseInt(await MetaMask.getChainId(), 16);
      if (contracts[chainId]){
        setResult(contracts[chainId][name]);
      } else {
        setResult(null);
      }
  })
  return result
}

/*const Infura = new NetworkConnector({
  providerURL: 'https://mainnet.infura.io/v3/...'
})

export const connectors = { MetaMask, Infura };
*/
