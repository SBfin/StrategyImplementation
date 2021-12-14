import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Deposit, Withdraw } from "../../common/vault";
import { fromUnitsToDecimal, calculateRatio, validateNumber, truncateNumber, FetchContract } from "../../common/helpers";
import { TokenBalance, Token, fetchActionsToken, tokenSlice, fetchAllToken, GetToken } from "../../common/TokenBalance";
import { useSelector, useDispatch } from "react-redux";
import Loader from "../../loader/Loader";
import { useWeb3React } from "@web3-react/core";
import { GetStrategy, fetchActionsStrategy } from "../../common/strategy";

const mapState = (state) => ({
  tokenStore: state.token,
  vaultStore: state.vault,
  strategyStore: state.strategy,
});

const mapDispatchToProps = (dispatch, ownProps) => ({});

function VaultInfo(props) {
  const { tokenStore, vaultStore, strategyStore } = props;
  const dispatch = useDispatch();

  const strategyContract = GetStrategy(vaultStore.strategyAddress.value);

  useEffect(() => {
    if (!strategyContract) {
      return;
    }
    dispatch(fetchActionsStrategy.price(strategyContract));
  }, [strategyContract]);

  return (
    <div className="row main-container">
      <div className="element">
        <label className="paste-label fs-2" style={{ textAlign: "center", width: "100%" }}>
          Holdings
        </label>
      </div>
      <div className="element">
        <label className="paste-label fs-6" style={{ textAlign: "center", width: "100%" }}>
          {tokenStore.symbolToken0} deposited: &nbsp;
          <span style={{ color: "green" }}>
            {truncateNumber(fromUnitsToDecimal(vaultStore.totalAmounts.value[0], tokenStore.decimalsToken0), 5)} {tokenStore.symbolToken0}
          </span>
        </label>
      </div>
      <div className="element">
        <label className="paste-label fs-6" style={{ textAlign: "center", width: "100%" }}>
          {tokenStore.symbolToken1} deposited: &nbsp;
          <span style={{ color: "green" }}>
            {truncateNumber(fromUnitsToDecimal(vaultStore.totalAmounts.value[1], tokenStore.decimalsToken1), 5)} {tokenStore.symbolToken1}
          </span>
        </label>
      </div>
      <div className="element">
        <label className="paste-label fs-6" style={{ textAlign: "center", width: "100%" }}>
          {tokenStore.symbolToken0} & {tokenStore.symbolToken1} Ratio &nbsp;
          <span style={{ color: "green" }}>
            {calculateRatio(
              fromUnitsToDecimal(vaultStore.totalAmounts.value[0], tokenStore.decimalsToken0),
              fromUnitsToDecimal(vaultStore.totalAmounts.value[1], tokenStore.decimalsToken1),
            )}
          </span>
        </label>
      </div>
      <div className="element">
        <label className="paste-label fs-6" style={{ textAlign: "center", width: "100%" }}>
          {tokenStore.symbolToken0}/{tokenStore.symbolToken1} Vault total shares: &nbsp;
          <span style={{ color: "green" }}> {truncateNumber(fromUnitsToDecimal(vaultStore.totalSupply.value, vaultStore.decimals), 5)}</span>
        </label>
      </div>
      <div className="element">
        <label className="paste-label fs-6" style={{ textAlign: "center", width: "100%" }}>
          {tokenStore.symbolToken1}/{tokenStore.symbolToken0} price: &nbsp;
          <span style={{ color: "green" }}> {strategyStore.price.value}</span>
        </label>
      </div>

      <div className="element">
        <label className="paste-label fs-2" style={{ textAlign: "center", width: "100%" }}>
          Deposit Cap
        </label>
      </div>
      <div className="element">
        <label className="paste-label fs-6" style={{ textAlign: "center", width: "100%" }}>
          % of the cap used: &nbsp;
          <span style={{ color: "green" }}>{(((vaultStore.totalSupply.value || 0) / (vaultStore.maxTotalSupply.value || 0)) * 100).toFixed(2)}%</span>
        </label>
      </div>

      <div className="element">
        <label className="paste-label fs-2" style={{ textAlign: "center", width: "100%" }}>
          Vault position
        </label>
      </div>
      <div className="element">
        <label className="paste-label fs-6" style={{ textAlign: "center", width: "100%" }}>
          Base order: &nbsp;
          <span style={{ color: "green" }}> {vaultStore.baseOrder.value[0] + " - " + vaultStore.baseOrder.value[1]} </span>
        </label>
      </div>
      <div className="element">
        <label className="paste-label fs-6" style={{ textAlign: "center", width: "100%" }}>
          Limit order: &nbsp;
          <span style={{ color: "green" }}> {vaultStore.limitOrder.value[0] + " - " + vaultStore.limitOrder.value[1]} </span>
        </label>
      </div>

      <div className="element">
        <label className="paste-label fs-2" style={{ textAlign: "center", width: "100%" }}>
          Contracts
        </label>
      </div>
      <div className="element">
        <label className="paste-label fs-6" style={{ textAlign: "center", width: "100%" }}>
          Vault: &nbsp;
          <span style={{ color: "green", wordWrap: "break-word" }}> {vaultStore.address}</span>
        </label>
      </div>
      <div className="element">
        <label className="paste-label fs-6" style={{ textAlign: "center", width: "100%" }}>
          Strategy: &nbsp;
          <span style={{ color: "green", wordWrap: "break-word" }}> {vaultStore.strategyAddress.value}</span>
        </label>
      </div>
    </div>
  );
}

export default connect(mapState, mapDispatchToProps)(VaultInfo);
