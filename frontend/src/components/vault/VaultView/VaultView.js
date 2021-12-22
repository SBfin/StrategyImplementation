import s from "./VaultView.module.css";
import Loader from "../../loader/Loader";
import { connect } from "react-redux";
import { TokenBalance, Token, fetchActionsToken, tokenSlice } from "../../common/TokenBalance";
import { GetVault, GetStrategy, Deposit, Withdraw, vaultSlice, fetchAllVault } from "../../common/vault";
import { Strategy } from "../../common/strategy";
import { useState, useEffect } from "react";
import { ContractAddress } from "../../../helpers/connector";
import { useSelector, useDispatch } from "react-redux";
import { useWeb3React } from "@web3-react/core";
import { fetchAll, getSymbolToken } from "../../common/helpers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import DepositSection from "../VaultDeposit/VaultDeposit";
import VaultInfo from "../VaultInfo/VaultInfo";
import WithdrawSection from "../VaultWithdraw/VaultWithdraw";
import VaultBalance from "../VaultBalance/VaultBalance";
import VaultCap from "../VaultCap/VaultCap";

const DEFAULT_BUTTON_TEXT = "Approve";
const ENTER_KEY_CODE = "Enter";

const mapState = (state) => ({
  symbolToken0: getSymbolToken(true, state.token.symbolToken0),
  symbolToken1: getSymbolToken(true, state.token.symbolToken1),
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  // TODO: move actions on state here
  //toggleTodo: () => dispatch(toggleTodo(ownProps.todoId)),
});

function VaultView(props) {
  const { symbolToken0, symbolToken1 } = props;
  const { account, library, chainId } = useWeb3React();
  const vaultStore = useSelector((state) => state.vault);
  const tokenStore = useSelector((state) => state.token);
  const dispatch = useDispatch();
  const vaultContractAddress = ContractAddress("vault");
  const vault = GetVault(vaultContractAddress);

  const [section, setSection] = useState(true);

  useEffect(() => {
    if (!vault) {
      return;
    }
    console.log("selected contract: ", vault.address);

    fetchAllVault(account, vault, dispatch);
  }, [vault]);

  return (
    <div className={`${s.root}`}>
      <div className={`${s.main}`}>
        <h1 className={`${s.title}`}>
          {tokenStore.symbolToken0} / {symbolToken1} VAULT
        </h1>
        <div className="row">
          <div className="col-6">
            <div className={`btn-group ${s.btnDiv}`} role="group" aria-label="Basic radio toggle button group">
              <button type="button" className={`rounded-left ${section ? s.buttonActive : s.buttonDisable} ${s.deposit}`} id="deposit" onClick={() => setSection(true)}>
                DEPOSIT
              </button>
              <button type="button" className={`rounded-right ${section ? s.buttonDisable : s.buttonActive} ${s.withdraw}`} id="withdraw" onClick={() => setSection(false)}>
                WITHDRAW
              </button>
            </div>
            <div className={`${s.blueContainer}`}>{section ? <DepositSection vault={vault} /> : <WithdrawSection vault={vault} />}</div>
            <div className={`${s.blueContainer}`}>
              <VaultBalance />
            </div>
          </div>
          <div className={`col-6`}>
            <div className={`${s.blueContainer}`}>
              <VaultCap />
            </div>
            <div className={`${s.blueContainer}`}>
              <VaultInfo />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default connect(mapState, mapDispatchToProps)(VaultView);
