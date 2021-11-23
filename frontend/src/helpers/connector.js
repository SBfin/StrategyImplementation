import { InjectedConnector } from '@web3-react/injected-connector'
//import { NetworkConnector } from '@web3-react/network-connector'
import { useState, useEffect } from 'react'

export const MetaMask = new InjectedConnector({ supportedNetworks: [1, 3, 4, 5, 42, 421611] })

const contracts = {
  1337: {"vault": "0x4D1B781ce59B8C184F63B99D39d6719A522f46B5", "eth": "0x2c15A315610Bfa5248E4CbCbd693320e9D8E03Cc", "dai": "0xe692Cf21B12e0B2717C4bF647F9768Fa58861c8b"}, //mainnet-fork
  3: {"vault": "0x130c973Bbe11CBc5BAE094a45710CDE4Bebb8438", "eth": "0x7F88e71C8aE4EB91AE678D2dd5dE6d7Bd7d5A019", "dai": "0x6c0f5CEf5dCF88F591C97f2BA9ba14B54727aae5"}, // Ropsten vault: 0x130c973Bbe11CBc5BAE094a45710CDE4Bebb8438
  69: {"vault": "0xa919F8Dd481dE4050F660738c0052a17d62c1d09", "eth": "0x7Dd703927F7BD4972b78F64A43A48aC5e9185954", "dai": "0xA6d0aE178b75b5BECfC909Aa408611cbc1a30170"}, // Optimism Kovan
  421611: {"vault": "0x341a480448283b33Fb357daFBf95dBAe2c6198a5", "eth": "0x55279F74D076A49722AdcD20695F224F49D777eC", "dai": "0x91c39df30F754c371110E80Dc6Cb51E4F06BC86B"}, // Arbitrum

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
