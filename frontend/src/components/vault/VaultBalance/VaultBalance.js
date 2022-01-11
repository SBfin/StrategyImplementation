import { useState, useEffect } from "react";
import { fromUnitsToDecimal, truncateNumber, calculateTVL, getSymbolToken } from "../../common/helpers";
import { useSelector } from "react-redux";
import { connect } from "react-redux";
import { BigNumber } from "@ethersproject/bignumber";
import s from "./VaultBalance.module.css";

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
  symbolToken0: getSymbolToken(true, state.token.symbolToken0),
  symbolToken1: getSymbolToken(true, state.token.symbolToken1),
});

function VaultBalance(props) {
  const { tokenStore, vaultStore, strategyStore, userToken0, userToken1, symbolToken0, symbolToken1 } = props;

  return (
    <div className={`${s.holdings}`}>
      <h1>YOUR POSITION</h1>
      <p>
        {symbolToken0} <span>{truncateNumber(fromUnitsToDecimal(userToken0, tokenStore.decimalsToken0), 4)}</span>
      </p>
      <hr />
      <p>
        {symbolToken1} <span>{truncateNumber(fromUnitsToDecimal(userToken1, tokenStore.decimalsToken1), 4)}</span>
      </p>
      <hr />
      <p>
        Value <span>${truncateNumber(calculateTVL(userToken0, userToken1, tokenStore.decimalsToken0, tokenStore.decimalsToken1, strategyStore.price.value), 2)}</span>
      </p>
      <hr />
    </div>
  );
}

export default connect(mapState)(VaultBalance);
