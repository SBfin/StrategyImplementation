import { useState, useEffect } from "react";
import { fromUnitsToDecimal, truncateNumber } from "../../common/helpers";
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
});

function VaultBalance(props) {
  const { tokenStore, vaultStore, strategyStore, userToken0, userToken1 } = props;

  return (
    <div className={`${s.holdings}`}>
      <h1>YOUR POSITION</h1>
      <p>
        {tokenStore.symbolToken0} <span>{truncateNumber(fromUnitsToDecimal(userToken0, tokenStore.decimalsToken0), 4)}</span>
      </p>
      <hr />
      <p>
        {tokenStore.symbolToken1} <span>{truncateNumber(fromUnitsToDecimal(userToken1, tokenStore.decimalsToken1), 4)}</span>
      </p>
      <hr />
      <p>
        Value{" "}
        <span>
          $
          {truncateNumber(
            fromUnitsToDecimal(vaultStore.totalAmounts.value[0], tokenStore.decimalsToken0) * strategyStore.price.value +
              fromUnitsToDecimal(vaultStore.totalAmounts.value[1], tokenStore.decimalsToken1),
            2,
          )}
        </span>
      </p>
      <hr />
    </div>
  );
}

export default connect(mapState)(VaultBalance);
