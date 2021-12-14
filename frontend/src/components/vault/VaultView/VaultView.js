import s from "./VaultView.module.css";
import Loader from "../../loader/Loader";
import { TokenBalance, Token, fetchActionsToken, tokenSlice } from "../../common/TokenBalance";
import { GetVault, GetStrategy, Deposit, Withdraw, vaultSlice, fetchAllVault } from "../../common/vault";
import { Strategy } from "../../common/strategy";
import { useState, useEffect } from "react";
import { ContractAddress } from "../../../helpers/connector";
import { useSelector, useDispatch } from "react-redux";
import { useWeb3React } from "@web3-react/core";
import { fetchAll, validateNumber, truncateNumber } from "../../common/helpers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import DepositSection from "../VaultDeposit/VaultDeposit";
import InfoSection from "../VaultInfo/VaultInfo";
import WithdrawSection from "../VaultWithdraw/VaultWithdraw";

const DEFAULT_BUTTON_TEXT = "Approve";
const ENTER_KEY_CODE = "Enter";

export default function VaultView(props) {
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
          {tokenStore.symbolToken0} / {tokenStore.symbolToken1} VAULT
        </h1>
        <div className="row">
          <div className="col-6">
            <div className={`btn-group ${s.btnDiv}`} role="group" aria-label="Basic radio toggle button group">
              <button type="button" className={`rounded-left ${section ? s.buttonActive : s.buttonDisable} ${s.deposit}`} id="deposit" onClick={() => setSection(true)}>
                Deposit{" "}
              </button>
              <button type="button" className={`rounded-right ${section ? s.buttonDisable : s.buttonActive} ${s.withdraw}`} id="withdraw" onClick={() => setSection(false)}>
                Withdraw{" "}
              </button>
            </div>
            <div className={`${s.blueContainer}`}>{section ? <DepositSection vault={vault} /> : <WithdrawSection vault={vault} />}</div>
            <div className={`${s.blueContainer}`}>Your holdings</div>
          </div>
          <div className={`col-6 ${s.blueContainer}`}>
            <InfoSection />
          </div>
        </div>
      </div>
    </div>
  );
}

/*

         <div style={{ textAlign: "center", width: "50%" }}>
        {vaultContractAddress === null && (
          <div className="main-container" style={{ background: "red" }}>
            <div>THIS CURRENT IS NOT SUPPORTED</div>
            <div>Please select a supported one</div>
          </div>
        )}
  
        <DepositSection vault={vault} />
        <InfoSection />
  
        {vaultStore.balanceOf.value > 0 && <WithdrawSection vault={vault} />}
        </div> 
*/
