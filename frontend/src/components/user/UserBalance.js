import { useState, useEffect } from "react";
import { fromUnitsToDecimal, truncateNumber } from "../common/helpers";
import { useSelector } from "react-redux";
import { connect } from "react-redux";
import { BigNumber } from "@ethersproject/bignumber";

const mapState = (state) => ({
  tokenStore: state.token,
  vaultStore: state.vault,
  userToken0: BigNumber.from(state.vault.balanceOf.value).div(BigNumber.from(state.vault.totalSupply.value)).mul(BigNumber.from(state.vault.totalAmounts.value[0])),
  userToken1: BigNumber.from(state.vault.balanceOf.value).div(BigNumber.from(state.vault.totalSupply.value)).mul(BigNumber.from(state.vault.totalAmounts.value[1])),
});

function UserBalance(props) {
  const { tokenStore, vaultStore, userToken0, userToken1 } = props;

  return (
    <div>
      <div className="element">
        <label className="paste-label" style={{ textAlign: "center", width: "100%" }}>
          Your balance:
          <span style={{ color: "green" }}>{fromUnitsToDecimal(vaultStore.balanceOf.value, vaultStore.decimals)}</span>
        </label>
      </div>
      <div className="row main-container">
        <div className="col-6">
          <div className="element">
            <label className="paste-label" style={{ textAlign: "center", width: "100%" }}>
              Your balance {tokenStore.symbolToken0}:<span style={{ color: "green" }}>{truncateNumber(fromUnitsToDecimal(userToken0, tokenStore.decimalsToken0), 4)}</span>
            </label>
          </div>
        </div>
        <div className="col-6">
          <div className="element">
            <label className="paste-label" style={{ textAlign: "center", width: "100%" }}>
              Your balance {tokenStore.symbolToken1}:<span style={{ color: "green" }}>{truncateNumber(fromUnitsToDecimal(userToken1, tokenStore.decimalsToken1), 4)}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default connect(mapState)(UserBalance);
