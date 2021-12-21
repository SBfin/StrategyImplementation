import { useWeb3React } from "@web3-react/core";
import { Web3Provider } from "@ethersproject/providers";
import React, { useEffect, useState } from "react";
import { Contract } from "@ethersproject/contracts";
import ERC20ABI from "./abi/MockToken.json";
import { formatUnits } from "@ethersproject/units";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fromUnitsToDecimal } from "./helpers";

const initialState = {
  symbolToken0: "",
  symbolToken1: "",
  balanceToken0: 0,
  balanceToken1: 0,
  allowanceToken0: 0,
  allowanceToken1: 0,
  decimalsToken0: 0,
  decimalsToken1: 0,
  ratioToken: 1,
};

export const fetchActionsToken = {
  symbol: createAsyncThunk("token/fetchSymbol", async (contract) => {
    const symbol = await contract.symbol();
    return symbol.toString();
  }),
  decimals: createAsyncThunk("token/fetchDecimals", async (contract) => {
    const decimals = await contract.decimals();
    return decimals.toString();
  }),
  balance: createAsyncThunk("token/fetchBalance", async (data) => {
    const { account, contract } = data;
    const balance = await contract.balanceOf(account);
    return balance.toString();
  }),
  allowance: createAsyncThunk("token/fetchAllowance", async (data) => {
    const { vault, account, contract } = data;
    const allowance = await contract.allowance(account, vault.address);
    return allowance.toString();
  }),
  approve: createAsyncThunk("token/fetchApprove", async (data) => {
    const { vault, contract } = data;
    let approveamount = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; //(2^256 - 1 )
    const approveTx = await contract.approve(vault.address, approveamount);
    const result = await approveTx.wait(); //wait for the tx to be confirmed on chain
    return result.status;
  }),
};

export const tokenSlice = createSlice({
  name: "token",
  initialState,
  reducers: {
    symbolToken0: (state, action) => {
      state.symbolToken0 = action.payload;
    },
    symbolToken1: (state, action) => {
      state.symbolToken1 = action.payload;
    },
    decimalsToken0: (state, action) => {
      state.decimalsToken0 = action.payload;
    },
    decimalsToken1: (state, action) => {
      state.decimalsToken1 = action.payload;
    },
    balanceToken0: (state, action) => {
      state.balanceToken0 = action.payload;
    },
    balanceToken1: (state, action) => {
      state.balanceToken1 = action.payload;
    },
    allowanceToken0: (state, action) => {
      state.allowanceToken0 = action.payload;
    },
    allowanceToken1: (state, action) => {
      state.allowanceToken1 = action.payload;
    },
    ratioToken: (state, action) => {
      if (action && action.payload) {
        if (Number(action.payload[0]) !== 0 || Number(action.payload[1]) !== 0) {
          state.ratioToken = fromUnitsToDecimal(action.payload[0], state.decimalsToken0) / fromUnitsToDecimal(action.payload[1], state.decimalsToken1);
        } else {
          state.ratioToken = 1;
        }
      } else {
        state.ratioToken = 1;
      }
      //console.log('ratio : ' + state.ratioToken)
    },
  },
});
export default tokenSlice.reducer;

export function fetchAllToken(account, contract, dispatch, token01, vault, vaultTotalAmounts) {
  if (!contract) {
    return;
  }

  if (token01 == "0") {
    dispatch(fetchActionsToken.symbol(contract)).then((r) => dispatch(tokenSlice.actions.symbolToken0(r.payload)));
    dispatch(fetchActionsToken.decimals(contract)).then((r) => dispatch(tokenSlice.actions.decimalsToken0(r.payload)));
    dispatch(fetchActionsToken.balance({ account, contract: contract })).then((r) => dispatch(tokenSlice.actions.balanceToken0(r.payload)));
    dispatch(fetchActionsToken.allowance({ vault, account, contract: contract })).then((r) => dispatch(tokenSlice.actions.allowanceToken0(r.payload)));
  } else {
    dispatch(fetchActionsToken.symbol(contract)).then((r) => dispatch(tokenSlice.actions.symbolToken1(r.payload)));
    dispatch(fetchActionsToken.decimals(contract)).then((r) => dispatch(tokenSlice.actions.decimalsToken1(r.payload)));
    dispatch(fetchActionsToken.balance({ account, contract: contract })).then((r) => dispatch(tokenSlice.actions.balanceToken1(r.payload)));
    dispatch(fetchActionsToken.allowance({ vault, account, contract: contract })).then((r) => dispatch(tokenSlice.actions.allowanceToken1(r.payload)));
  }
  dispatch(tokenSlice.actions.ratioToken(vaultTotalAmounts));
}

export function GetToken(address) {
  const { account, library, chainId } = useWeb3React();

  const [contract, setContract] = useState();
  //const [decimals, setDecimals] = useState()

  useEffect(async () => {
    if (!(!!account || !!library) || !address) {
      return;
    }
    // listen for changes on an Ethereum address
    console.log(`listening for Transfer...`);
    const signer = library.getSigner(account).connectUnchecked();
    const c = new Contract(address, ERC20ABI.abi, signer);

    setContract(c);
  }, [account, library, chainId, address]);

  return contract;
}

export function TokenBalance({ balance, decimals }) {
  if (!balance) {
    return <span>...</span>;
  }
  return <span>{Math.round(parseFloat(formatUnits(balance, decimals)) * 100) / 100}</span>;
}
