import { useState, useEffect } from "react";
import { fromUnitsToDecimal, truncateNumber } from "../../common/helpers";
import { useSelector } from "react-redux";
import { connect } from "react-redux";
import { BigNumber } from "@ethersproject/bignumber";
import s from "./VaultCap.module.css";

const mapState = (state) => ({
  tokenStore: state.token,
  vaultStore: state.vault,
  strategyStore: state.strategy,
  userToken0:
    state.vault.totalSupply.value !== 0
      ? BigNumber.from(state.vault.balanceOf.value).div(BigNumber.from(state.vault.totalSupply.value)).mul(BigNumber.from(state.vault.totalAmounts.value[0]))
      : 1,
  userToken1:
    state.vault.totalSupply.value !== 0
      ? BigNumber.from(state.vault.balanceOf.value).div(BigNumber.from(state.vault.totalSupply.value)).mul(BigNumber.from(state.vault.totalAmounts.value[1]))
      : 1,
});

function VaultCap(props) {
  const { tokenStore, vaultStore, strategyStore, userToken0, userToken1 } = props;

  return (
    <div className={`${s.root}`}>
      <h1>DEPOSIT CAP</h1>
      <div className="row">
        <p className="col-7">MAX TVL </p>
        <span className="col-3">${strategyStore.price.value * vaultStore.maxTotalSupply.value}</span>
      </div>
      <div className="row">
        <p className="col-7">% of the cap used </p>
        <span className="col-3">{(((vaultStore.totalSupply.value || 0) / (vaultStore.maxTotalSupply.value || 0)) * 100).toFixed(2)}%</span>
      </div>
    </div>
  );
}

export default connect(mapState)(VaultCap);
