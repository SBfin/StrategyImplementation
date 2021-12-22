import { HomeCard } from "../HomeCard/HomeCard";
import { HomeCardEmpty } from "../HomeCardEmpty/HomeCardEmpty";
import s from "./HomeView.module.css";
import { VaultContractAddresses } from "../../../helpers/connector";
import { loadVault } from "../../common/vault";
import { loadStrategy } from "../../common/strategy";
import { loadToken } from "../../common/TokenBalance";
import { useState, useEffect } from "react";
import { useWeb3React } from "@web3-react/core";
import { tickToPrice, fromUnitsToDecimal, truncateNumber, calculateTVL } from "../../common/helpers";

export default function HomeView(props) {
  const vaultAddresses = VaultContractAddresses();

  const { account, library, chainId } = useWeb3React();
  const [vaults, setVaults] = useState([]);
  const [total, setTotal] = useState(0);
  const [tokensDetails, setTokensDetails] = useState([]);
  const [tokens, setTokens] = useState([]);

  const calculateTotal = async (account, library, vault, token0, token1) => {
    const totalAmountsP = vault.getTotalAmounts();
    const decimals0P = token0.decimals();
    const decimals1P = token1.decimals();

    const totalSupply = vault.totalSupply();
    const maxTotalSupply = vault.maxTotalSupply();

    const strategyP = loadStrategy(account, library, await vault.strategy.call());

    const decimals0 = await decimals0P;
    const decimals1 = await decimals1P;
    const totalAmounts = await totalAmountsP;
    const strategy = await strategyP;

    const price = 1 / tickToPrice(await strategy.getTick(), decimals0, decimals1);
    const tvl = calculateTVL(totalAmounts[0], totalAmounts[1], decimals0, decimals1, price);

    const cap = ((((await totalSupply) || 0) / ((await maxTotalSupply) || 1)) * 100).toFixed(2);

    setTokensDetails((oldTokens) => [...oldTokens, { tvl: tvl, cap: cap }]);
    setTotal((oldTotal) => oldTotal + tvl);
  };

  const loadThings = async (account, library, vault) => {
    const token0Address = vault.token0();
    const token1Address = vault.token1();
    const token0P = loadToken(account, library, await token0Address);
    const token1P = loadToken(account, library, await token1Address);

    calculateTotal(account, library, vault, token0P, token1P);

    const token0 = await token0P;
    const token1 = await token1P;
    const symbol0P = token0.symbol();
    const symbol1P = token1.symbol();
    const vaultAddress = vault.address;

    const symbol0 = await symbol0P;
    const symbol1 = await symbol1P;

    setTokens((oldTokens) => [...oldTokens, { token0: symbol0, token1: symbol1, vault: vaultAddress }]);
  };

  useEffect(async () => {
    setVaults([]);
    setTotal(0);
    setTokensDetails([]);
    setTokens([]);
    for (const address of vaultAddresses) {
      const loadedVault = loadVault(account, library, address);
      if (loadedVault) {
        setVaults((oldVaults) => [...oldVaults, loadedVault]);
        loadThings(account, library, loadedVault);
      }
    }
  }, [JSON.stringify(vaultAddresses), library, chainId]);

  return (
    <div className={`${s.root}`}>
      <div className={`row ${s.main}`}>
        <h1 className="col-6">
          Optimized <span>Liquidity Vaults</span> for Uniswap V3
        </h1>
        <h1 className="col-6 text-end">
          TVL: <span>$ {truncateNumber(total, 2)}</span>
        </h1>
      </div>
      <hr />

      <div className={`${s.scrollable}`}>
        <div className="row">
          {[...Array(3)].map((x, i) => (
            <div key={i} className="col-4">
              {vaults[i] ? <HomeCard tokenData={tokens[i]} tokensDetails={tokensDetails[i]} /> : <HomeCardEmpty />}
            </div>
          ))}
        </div>
        <div className="row">
          <div className="col-4">
            <HomeCardEmpty />
          </div>
          <div className="col-4">
            <HomeCardEmpty />
          </div>
          <div className="col-4">
            <HomeCardEmpty />
          </div>
        </div>
      </div>
    </div>
  );
}
