import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Deposit, Withdraw } from "../../common/vault";
import { fromUnitsToDecimal, validateNumber, truncateNumber, FetchContract, tickToPrice } from "../../common/helpers";
import { TokenBalance, Token, fetchActionsToken, tokenSlice, fetchAllToken, GetToken } from "../../common/TokenBalance";
import { useSelector, useDispatch } from "react-redux";
import Loader from "../../loader/Loader";
import { useWeb3React } from "@web3-react/core";
import { GetStrategy, fetchActionsStrategy } from "../../common/strategy";
import s from "./VaultInfo.module.css";

const mapState = (state) => ({
  tokenStore: state.token,
  vaultStore: state.vault,
  strategyStore: state.strategy,
  baseOrder: [
    truncateNumber(1 / tickToPrice(state.vault.base[0], state.token.decimalsToken0, state.token.decimalsToken1), 2),
    truncateNumber(1 / tickToPrice(state.vault.base[1], state.token.decimalsToken0, state.token.decimalsToken1), 2),
  ],
  limitOrder: [
    truncateNumber(1 / tickToPrice(state.vault.limit[0], state.token.decimalsToken0, state.token.decimalsToken1), 2),
    truncateNumber(1 / tickToPrice(state.vault.limit[1], state.token.decimalsToken0, state.token.decimalsToken1), 2),
  ],
  totalAmountsInDecimals: [
    fromUnitsToDecimal(state.vault.totalAmounts.value[0], state.token.decimalsToken0),
    fromUnitsToDecimal(state.vault.totalAmounts.value[1], state.token.decimalsToken1),
  ],
});

const mapDispatchToProps = (dispatch, ownProps) => ({});

function VaultInfo(props) {
  const { tokenStore, vaultStore, strategyStore, baseOrder, limitOrder, totalAmountsInDecimals } = props;
  const dispatch = useDispatch();

  const strategyContract = GetStrategy(vaultStore.strategyAddress.value);
  const shortAddressVault = vaultStore.address && `${vaultStore.address.slice(0, 5)}...${vaultStore.address.slice(vaultStore.address.length - 4, vaultStore.address.length)}`;
  const shortAddressStrategy =
    vaultStore.strategyAddress.value &&
    `${vaultStore.strategyAddress.value.slice(0, 5)}...${vaultStore.strategyAddress.value.slice(
      vaultStore.strategyAddress.value.length - 4,
      vaultStore.strategyAddress.value.length,
    )}`;

  useEffect(() => {
    if (!strategyContract) {
      return;
    }
    dispatch(fetchActionsStrategy.price({ strategy: strategyContract, decimals0: tokenStore.decimalsToken0, decimals1: tokenStore.decimalsToken1 }));
  }, [strategyContract, tokenStore.decimalsToken0, tokenStore.decimalsToken1]);

  return (
    <div className={`${s.root}`}>
      <h1>VAULT DATA</h1>
      <h2>Vault holdings</h2>
      <div className="row">
        <p className="col-7">TVL</p>
        <span className="col-3">
          $
          {truncateNumber(fromUnitsToDecimal(vaultStore.totalAmounts.value[0], tokenStore.decimalsToken0), 2) * strategyStore.price.value +
            truncateNumber(fromUnitsToDecimal(vaultStore.totalAmounts.value[1], tokenStore.decimalsToken1), 2)}
        </span>
      </div>
      <div className="row">
        <p className="col-7">Total {tokenStore.symbolToken0}</p>
        <span className="col-3">{truncateNumber(fromUnitsToDecimal(vaultStore.totalAmounts.value[0], tokenStore.decimalsToken0), 5)}</span>
      </div>
      <div className="row">
        <p className="col-7">Total {tokenStore.symbolToken1}</p>
        <span className="col-3">{truncateNumber(fromUnitsToDecimal(vaultStore.totalAmounts.value[1], tokenStore.decimalsToken1), 2)}</span>
      </div>
      <div className="row">
        <p className="col-7">
          {tokenStore.symbolToken0} & {tokenStore.symbolToken1} ratio
        </p>
        <span className="col-3">
          {totalAmountsInDecimals[0] > totalAmountsInDecimals[1]
            ? truncateNumber(totalAmountsInDecimals[0] / totalAmountsInDecimals[1], 1) + " : 1"
            : "1 : " + truncateNumber(totalAmountsInDecimals[1] / totalAmountsInDecimals[0], 1)}
        </span>
      </div>
      <h2>Vault positions</h2>
      <div className="row">
        <p className="col-7">
          {tokenStore.symbolToken0} / {tokenStore.symbolToken1} price
        </p>
        <span className="col-3">{strategyStore.price.value}</span>
      </div>
      <div className="row">
        <p className="col-7">Base order</p>
        <span className="col-3">{baseOrder[0] + " - " + baseOrder[1]}</span>
      </div>
      <div className="row">
        <p className="col-7">Limit order</p>
        <span className="col-3">{limitOrder[0] + " - " + limitOrder[1]}</span>
      </div>
      <h2>Contracts</h2>
      <div className="row">
        <p className="col-7">Vault</p>
        <span className="col-3">{shortAddressVault}</span>
      </div>
      <div className="row">
        <p className="col-7">Strategy</p>
        <span className="col-3">{shortAddressStrategy}</span>
      </div>
      <div className="row">
        <p className="col-7">Uniswap V3 Pool</p>
        <span className="col-3">WETH / USDC</span>
      </div>
    </div>
  );
}

export default connect(mapState, mapDispatchToProps)(VaultInfo);
