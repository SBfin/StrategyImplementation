import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Deposit, Withdraw } from "../../common/vault";
import { fromUnitsToDecimal, validateNumber, truncateNumber, FetchContract } from "../../common/helpers";
import { TokenBalance, Token, fetchActionsToken, tokenSlice, fetchAllToken, GetToken } from "../../common/TokenBalance";
import { useSelector, useDispatch } from "react-redux";
import Loader from "../../loader/Loader";
import { useWeb3React } from "@web3-react/core";
import UserBalance from "../../user/UserBalance";
import { BigNumber } from "@ethersproject/bignumber";
import s from "./VaultWithdraw.module.css";

const mapState = (state) => ({
  tokenStore: state.token,
  vaultStore: state.vault,
  userToken0:
    state.vault.totalSupply.value !== 0
      ? BigNumber.from(state.vault.balanceOf.value).div(BigNumber.from(state.vault.totalSupply.value)).mul(BigNumber.from(state.vault.totalAmounts.value[0]))
      : 1,
  userToken1:
    state.vault.totalSupply.value !== 0
      ? BigNumber.from(state.vault.balanceOf.value).div(BigNumber.from(state.vault.totalSupply.value)).mul(BigNumber.from(state.vault.totalAmounts.value[1]))
      : 1,
});

const mapDispatchToProps = (dispatch, ownProps) => ({});

function VaultWithdraw(props) {
  const { tokenStore, vaultStore, vault, userToken0, userToken1 } = props;

  const dispatch = useDispatch();

  const [loader, setLoader] = useState(false);
  const [shares, setShares] = useState("");
  const [input, setInput] = useState("");
  const [token0, setToken0] = useState(0);
  const [token1, setToken1] = useState(0);
  const [ethWithdraw, setEthWithdraw] = useState(false);

  const ethWithdrawChange = (checkEth) => {
    if (tokenStore.symbolToken1 == "WETH" && checkEth) {
      dispatch(tokenSlice.actions.symbolToken1("ETH"));
    }
    if (tokenStore.symbolToken1 == "ETH" && !checkEth) {
      dispatch(tokenSlice.actions.symbolToken1("WETH"));
    }
    if (tokenStore.symbolToken0 == "WETH" && checkEth) {
      dispatch(tokenSlice.actions.symbolToken0("ETH"));
    }
    if (tokenStore.symbolToken0 == "ETH" && !checkEth) {
      dispatch(tokenSlice.actions.symbolToken0("WETH"));
    }
  };

  const onWithdrawClick = async () => {
    setLoader(true);
    const val = parseFloat(shares) * Math.pow(10, vaultStore.decimals);
    await Withdraw(vault, val, ethWithdraw);
    setLoader(false);
  };

  return (
    <div className="main-container">
      <div className={`${s.root}`}>
        <p className={`${s.labelToken}`}>Balance: {truncateNumber(fromUnitsToDecimal(vaultStore.balanceOf.value, vaultStore.decimals), 4)}</p>
        <div className={`${s.inputDiv}`}>
          <div className={`${s.tokenDiv}`}>
            <label className={`pasta-label ${s.labelNameToken}`}>Vault shares</label>
          </div>
          <input
            type="text"
            placeholder="0.0"
            className={`address-input ${s.input}`}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setToken0(
                (truncateNumber(fromUnitsToDecimal(userToken0, tokenStore.decimalsToken0), 4) /
                  truncateNumber(fromUnitsToDecimal(vaultStore.balanceOf.value, vaultStore.decimals), 4)) *
                  e.target.value,
              );
              setToken1(
                (truncateNumber(fromUnitsToDecimal(userToken1, tokenStore.decimalsToken1), 4) /
                  truncateNumber(fromUnitsToDecimal(vaultStore.balanceOf.value, vaultStore.decimals), 4)) *
                  e.target.value,
              );
              setShares(e.target.value);
            }}
          />
        </div>
        <div>
          <input
            type="checkbox"
            onChange={(e) => {
              setEthWithdraw(e.target.checked);
              ethWithdrawChange(e.target.checked);
            }}
          />
          <label>Deposit Eth</label>
        </div>
        <div className={`${s.subDiv}`}>
          <h3 className={`${s.subTitle}`}>You'll receive</h3>

          <div className={`${s.tokenSharesDiv}`}>
            <hr />
            <img className={`${s.tokenImage}`} src={"/assets/" + tokenStore.symbolToken0 + ".png"} />
            <label>{tokenStore.symbolToken0}</label>
            <span>{token0}</span>
          </div>
          <div className={`${s.tokenSharesDiv}`}>
            <img className={`${s.tokenImage}`} src={"/assets/" + tokenStore.symbolToken1 + ".png"} />
            <label>{tokenStore.symbolToken1}</label>
            <span>{token1}</span>
            <hr />
          </div>
        </div>
      </div>

      <button className={`col-12 ${s.withdrawButton}`} onClick={onWithdrawClick}>
        <span>WITHDRAW</span>
      </button>
    </div>
  );
}

export default connect(mapState, mapDispatchToProps)(VaultWithdraw);
