import { InjectedConnector } from "@web3-react/injected-connector";
//import { NetworkConnector } from '@web3-react/network-connector'
import { useState, useEffect } from "react";

export const MetaMask = new InjectedConnector({ supportedNetworks: [1, 3, 4, 5, 42, 421611] });

const contracts = {
  1337: ["0x2c15A315610Bfa5248E4CbCbd693320e9D8E03Cc"], //mainnet-fork
  3: ["0xfD2f29A150871dFc7Ea0559C6e0dbA2A01A9ec5B"], // Ropsten
  69: ["0xa919F8Dd481dE4050F660738c0052a17d62c1d09"], // Optimism Kovan
  421611: ["0xD27435518D79c4aA605DEF9A5B369bcC709C9a9F"], // Arbitrum
  42161: ["0xa7e1e151b4a24b403c272ec0a4d2b89ee30ea6b9"], // Arbitrum Mainnet
};

export function VaultContractAddresses() {
  const [result, setResult] = useState([]);
  useEffect(async () => {
    const chainId = parseInt(await MetaMask.getChainId(), 16);
    if (contracts[chainId]) {
      setResult(contracts[chainId]);
    } else {
      setResult([]);
    }
  });
  return result;
}

/*const Infura = new NetworkConnector({
  providerURL: 'https://mainnet.infura.io/v3/...'
})

export const connectors = { MetaMask, Infura };
*/
