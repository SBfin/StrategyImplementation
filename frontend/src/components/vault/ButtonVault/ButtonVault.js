import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Deposit, Withdraw, vaultSlice } from "../../common/vault";
import { fromUnitsToDecimal, validateNumber, truncateNumber, FetchContract, getSymbolToken } from "../../common/helpers";
import { TokenBalance, Token, fetchActionsToken, tokenSlice, fetchAllToken, GetToken } from "../../common/TokenBalance";
import EthBalance from "../../common/EthBalance";
import { MetaMask } from "../../../helpers/connector";
import { useSelector, useDispatch } from "react-redux";
import Loader from "../../loader/Loader";
import { formatEther } from "@ethersproject/units";
import { useWeb3React } from "@web3-react/core";
import s from "./ButtonVault.module.css";

const mapState = (state) => ({
  tokenStore: state.token,
  vaultStore: state.vault,
  token0Address: state.vault.token0Address,
  token1Address: state.vault.token1Address,
  vaultTotalAmounts: state.vault.totalAmounts.value,
  symbolToken0: getSymbolToken(state.vault.useEth, state.token.symbolToken0),
  symbolToken1: getSymbolToken(state.vault.useEth, state.token.symbolToken1),
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  // TODO: move actions on state here
  //toggleTodo: () => dispatch(toggleTodo(ownProps.todoId)),
});

function ButtonVault(props) {
  const { tokenStore, vault, input1, input2, validate, vaultStore, token0Address, token1Address, vaultTotalAmounts, symbolToken0, symbolToken1 } = props;

  const dispatch = useDispatch();
  const { account, library, chainId, activate } = useWeb3React();

  const [loader, setLoader] = useState(false);
  const [ethBalance, setEthBalance] = useState(0);
  const isButtonDisabled = props.fetching;

  const validateNum = validateNumber(
    input1,
    input2,
    symbolToken0,
    symbolToken1,
    vaultStore.useEth && symbolToken0 == "ETH" ? ethBalance : fromUnitsToDecimal(tokenStore.balanceToken0, tokenStore.decimalsToken0),
    vaultStore.useEth && symbolToken1 == "ETH" ? ethBalance : fromUnitsToDecimal(tokenStore.balanceToken1, tokenStore.decimalsToken1),
  );

  const onDepositClick = async () => {
    setLoader(true);
    const val1 = parseFloat(input1 || 0) * Math.pow(10, tokenStore.decimalsToken0);
    const val2 = parseFloat(input2 || 0) * Math.pow(10, tokenStore.decimalsToken1);
    await Deposit(vault, val1, val2, vaultStore.useEth, symbolToken0 == "ETH" ? val1 : val2);
    setLoader(false);
  };

  const token0Contract = GetToken(token0Address);
  const token1Contract = GetToken(token1Address);

  useEffect(() => {
    if (!token0Contract || !token1Contract) {
      return;
    }
    library.getBalance(account).then((res) => {
      setEthBalance(parseFloat(formatEther(res)).toPrecision(4));
    });

    fetchAllToken(account, token0Contract, dispatch, "0", vault, vaultTotalAmounts);
    fetchAllToken(account, token1Contract, dispatch, "1", vault, vaultTotalAmounts);
  }, [token0Contract, token1Contract, vaultStore, input1, input2]);

  return (
    <div className={`${s.approveDiv}`}>
      {!account ? (
        <button className={`search-button ${isButtonDisabled ? "search-button-clicked" : ""} ${s.approveButton}`} onClick={() => activate(MetaMask)} disabled={isButtonDisabled}>
          Connect Wallet
        </button>
      ) : ((!input1 && !input2) || (input1 == 0 && input2 == 0)) == true ? (
        <button
          className={`search-button col-12 ${isButtonDisabled ? "search-button-clicked" : ""} ${s.approveButton}`}
          onClick={() => console.log("invalid value")}
          disabled={isButtonDisabled}
        >
          INSERT SOME VALUE
        </button>
      ) : (account && input1 && tokenStore.allowanceToken0 === "0" && symbolToken0 !== "ETH") == true ? (
        <button
          className={`search-button col-12 ${isButtonDisabled ? "search-button-clicked" : ""} ${s.approveButton}`}
          onClick={() =>
            dispatch(fetchActionsToken.approve({ vault, contract: token0Contract })).then((r) =>
              dispatch(tokenSlice.actions.allowanceToken0(r.payload != undefined ? r.payload : "0")),
            )
          }
          disabled={isButtonDisabled}
        >
          APPROVE {symbolToken0}
        </button>
      ) : (account && input2 && tokenStore.allowanceToken1 === "0" && symbolToken1 !== "ETH") == true ? (
        <button
          className={`search-button col-12 ${isButtonDisabled ? "search-button-clicked" : ""} ${s.approveButton}`}
          onClick={() =>
            dispatch(fetchActionsToken.approve({ vault, contract: token1Contract })).then((r) =>
              dispatch(tokenSlice.actions.allowanceToken1(r.payload != undefined ? r.payload : "0")),
            )
          }
          disabled={isButtonDisabled}
        >
          APPROVE {symbolToken1}
        </button>
      ) : (
        <button className={`col-12 ${s.depositButton}`} onClick={onDepositClick} disabled={validateNum.disable}>
          <span>{validateNum.message}</span>
        </button>
      )}
    </div>
  );
}

export default connect(mapState, mapDispatchToProps)(ButtonVault);
