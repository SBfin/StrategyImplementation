import Loader from "../loader/Loader";
import { TokenBalance, Token, fetchActionsToken, tokenSlice } from "../eth/TokenBalance";
import { GetVault, GetStrategy, Deposit, Withdraw, vaultSlice, fetchAllVault } from "../eth/vault";
import { Strategy } from "../eth/strategy";
import { useState, useEffect } from "react";
import { ContractAddress } from "../../helpers/connector";
import { useSelector, useDispatch } from "react-redux";
import "./Main.scss";
import { useWeb3React } from "@web3-react/core";
import { fetchAll, validateNumber, truncateNumber } from "../eth/helpers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import DepositSection from "./DepositSection";
import InfoSection from "./InfoSection";
import WithdrawSection from "./WithdrawSection";

const DEFAULT_BUTTON_TEXT = "Approve";
const ENTER_KEY_CODE = "Enter";

export default function Main(props) {
  const { account, library, chainId } = useWeb3React();

  const vaultStore = useSelector((state) => state.vault);
  const dispatch = useDispatch();

  const vaultContractAddress = ContractAddress("vault");
  const vault = GetVault(vaultContractAddress);

  useEffect(() => {
    if (!vault) {
      return;
    }
    console.log("selected contract: ", vault.address);

    fetchAllVault(account, vault, dispatch);
  }, [vault]);

  return (
    <div style={{ textAlign: "center", width: "50%" }}>
      {vaultContractAddress == null && (
        <div className="main-container" style={{ background: "red" }}>
          <div>THIS CURRENT IS NOT SUPPORTED</div>
          <div>Please select a supported one</div>
        </div>
      )}

      <DepositSection vault={vault} />
      <InfoSection />

      {vaultStore.balanceOf.value > 0 && <WithdrawSection vault={vault} />}
    </div>
  );
}
