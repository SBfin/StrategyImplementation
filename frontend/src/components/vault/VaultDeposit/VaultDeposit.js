import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Deposit, Withdraw } from "../../common/vault";
import { fromUnitsToDecimal, validateNumber, truncateNumber, FetchContract } from "../../common/helpers";
import { TokenBalance, Token, fetchActionsToken, tokenSlice, fetchAllToken, GetToken } from "../../common/TokenBalance";
import { useSelector, useDispatch } from "react-redux";
import Loader from "../../loader/Loader";
import { useWeb3React } from "@web3-react/core";
import s from "./VaultDeposit.module.css";

const mapState = (state) => ({
  tokenStore: state.token,
  vaultStore: state.vault,
  token0Address: state.vault.token0Address,
  token1Address: state.vault.token1Address,
  vaultTotalAmounts: state.vault.totalAmounts.value,
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  // TODO: move actions on state here
  //toggleTodo: () => dispatch(toggleTodo(ownProps.todoId)),
});

function VaultDeposit(props) {
  const { tokenStore, vault, vaultStore, token0Address, token1Address, vaultTotalAmounts } = props;

  const dispatch = useDispatch();
  const { account, library, chainId } = useWeb3React();

  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [disable, setDisable] = useState(true);
  const [messageError, setMessageError] = useState("Deposit");

  const [loader, setLoader] = useState(false);
  const isButtonDisabled = props.fetching;

  const onDepositClick = async () => {
    setLoader(true);
    const val1 = parseFloat(input1 || 0) * Math.pow(10, tokenStore.decimalsToken0);
    const val2 = parseFloat(input2 || 0) * Math.pow(10, tokenStore.decimalsToken1);
    await Deposit(vault, val1, val2);
    setLoader(false);
  };

  const token0Contract = GetToken(token0Address);
  const token1Contract = GetToken(token1Address);

  useEffect(() => {
    if (!token0Contract || !token1Contract) {
      return;
    }
    fetchAllToken(account, token0Contract, dispatch, "0", vault, vaultTotalAmounts);
    fetchAllToken(account, token1Contract, dispatch, "1", vault, vaultTotalAmounts);
  }, [token0Contract, token1Contract, vaultStore]);

  return (
    <div className="main-container">
      <div className={`${s.main}`}>
        <p className={`${s.labelToken}`}>
          Balance: <TokenBalance balance={tokenStore.balanceToken0} decimals={tokenStore.decimalsToken0} />
        </p>
        <div className={`${s.inputDiv}`}>
          <div className={`${s.tokenDiv}`}>
            <img className={`${s.tokenImage}`} src="./assets/Ethereum.png" />
            <label className={`pasta-label ${s.labelNameToken}`}>{tokenStore.symbolToken0}</label>
          </div>
          <input
            type="text"
            placeholder="0.0"
            className={`address-input ${s.input}`}
            value={input1}
            onChange={(e) => {
              setInput1(e.target.value);
              setInput2(truncateNumber(e.target.value / tokenStore.ratioToken, 5));
              const validate = validateNumber(
                e.target.value,
                e.target.value / tokenStore.ratioToken,
                fromUnitsToDecimal(tokenStore.balanceToken0, tokenStore.decimalsToken0),
                fromUnitsToDecimal(tokenStore.balanceToken1, tokenStore.decimalsToken1),
              );
              if (validate) {
                setDisable(true);
                setMessageError(validate);
              } else {
                setDisable(false);
              }
            }}
          />
        </div>

        <p className={`${s.labelToken}`}>
          Balance: <TokenBalance balance={tokenStore.balanceToken1} decimals={tokenStore.decimalsToken1} />
        </p>
        <div className={`${s.inputDiv}`}>
          <div className={`${s.tokenDiv}`}>
            <img className={`${s.tokenImage}`} src="./assets/Ethereum.png" />
            <label className={`pasta-label ${s.labelNameToken}`}>{tokenStore.symbolToken1}</label>
          </div>
          <input
            type="text"
            placeholder="0.0"
            className={`address-input ${s.input}`}
            disabled={props.fetching}
            value={input2}
            onChange={(e) => {
              setInput2(e.target.value);
              setInput1(truncateNumber(e.target.value * tokenStore.ratioToken, 5));
              const validate = validateNumber(
                e.target.value * tokenStore.ratioToken,
                e.target.value,
                fromUnitsToDecimal(tokenStore.balanceToken0, tokenStore.decimalsToken0),
                fromUnitsToDecimal(tokenStore.balanceToken1, tokenStore.decimalsToken1),
              );
              if (validate) {
                setDisable(true);
                setMessageError(validate);
              } else {
                setDisable(false);
              }
            }}
          />
        </div>
      </div>
      <div>
        <p className={`${s.note}`}>Note thet the deposits are in the same ratio as the vault’s current holdings and are therefore not necessarely in a 1:1 ratio.</p>
      </div>

      <div className={`${s.approveDiv}`}>
        {tokenStore.allowanceToken0 === "0" && (
          <button
            className={`search-button ${isButtonDisabled ? "search-button-clicked" : ""} ${s.approveButton}`}
            onClick={() => dispatch(fetchActionsToken.approve({ vault, contract: token0Contract })).then((r) => dispatch(tokenSlice.actions.allowanceToken0(r.payload)))}
            disabled={isButtonDisabled}
          >
            Approve {tokenStore.symbolToken0}
          </button>
        )}
        {tokenStore.allowanceToken1 === "0" ? (
          <button
            className={`search-button ${isButtonDisabled ? "search-button-clicked" : ""} ${s.approveButton}`}
            onClick={() => dispatch(fetchActionsToken.approve({ vault, contract: token1Contract })).then((r) => dispatch(tokenSlice.actions.allowanceToken1(r.payload)))}
            disabled={isButtonDisabled}
          >
            Approve {tokenStore.symbolToken1}
          </button>
        ) : (
          tokenStore.allowanceToken0 !== "0" &&
          tokenStore.allowanceToken1 !== "0" && (
            <button className="btn btn-primary col-12 btn-lg" onClick={onDepositClick} disabled={disable}>
              {disable && <span>{messageError}</span>}
              {!disable && <span>Deposit</span>}
            </button>
          )
        )}
      </div>
      {loader && (
        <div style={{ textAlign: "center", width: "100%" }}>
          <Loader />
        </div>
      )}
    </div>
  );
}

export default connect(mapState, mapDispatchToProps)(VaultDeposit);