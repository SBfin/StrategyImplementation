import {useWeb3React} from "@web3-react/core";
import {Web3Provider} from "@ethersproject/providers";
import React, {useEffect, useState} from "react";
import {Contract} from "@ethersproject/contracts";
import ERC20ABI from "./abi/MockToken.json";
import {formatUnits} from "@ethersproject/units";
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {decimalFormat} from '../eth/helpers';

const initialState = {
  balanceEth: 0,
  balanceDai: 0,
  allowanceEth: 0,
  allowanceDai: 0,
  decimalsEth: 0,
  decimalsDai: 0,
  ratioToken: 0,

};

export const fetchActionsToken = {
    decimals: createAsyncThunk(
      'token/fetchDecimals',
      async (contract) => {
         const decimals = await contract.decimals();
         return decimals.toString();
    }),
    balance: createAsyncThunk(
      'token/fetchBalance',
      async (data) => {
        const { account, contract } = data;
         const balance = await contract.balanceOf(account);
         return balance.toString();
    }),
    allowance: createAsyncThunk(
      'token/fetchAllowance',
      async (data) => {
        const {vault, account, contract} = data;
        const allowance = await contract.allowance(account, vault.address);
        return allowance.toString()
    }),
    approve: createAsyncThunk(
      'token/fetchApprove',
      async(data) => {
        const {vault, contract, balance} = data;
        const approveTx = await contract.approve(vault.address, balance);
        const result = await approveTx.wait(); //wait for the tx to be confirmed on chain
        return result.status;
    }),
};

export const tokenSlice = createSlice({
  name: 'token',
  initialState,
  reducers: {
      decimalsEth: (state, action) => {
        state.decimalsEth = action.payload;
      },
      decimalsDai: (state, action) => {
        state.decimalsDai = action.payload
      },
      balanceEth: (state, action) => {
        state.balanceEth = action.payload;
      },
      balanceDai: (state, action) => {
        state.balanceDai = action.payload;
      },
      allowanceEth: (state, action) => {
        state.allowanceEth = action.payload;
      },
      allowanceDai: (state, action) => {
        state.allowanceDai = action.payload;
      },
      ratioToken: (state, action) => {
        console.log(action)
        console.log(state.decimalsDai)
        state.ratioToken = decimalFormat(action.payload[0], state.decimalsEth) / decimalFormat(action.payload[1], state.decimalsDai)
        console.log(state.ratioToken)
      }
  },
});
export default tokenSlice.reducer;

export function Token(address){
    const {account, library, chainId} = useWeb3React()

    const [contract, setContract] = useState()
    //const [decimals, setDecimals] = useState()

    useEffect(async () => {
      if (!(!!account || !!library) || !address) {
          return
      }
      // listen for changes on an Ethereum address
      console.log(`listening for Transfer...`)
      const signer = library.getSigner(account).connectUnchecked()
      const c = new Contract(address, ERC20ABI.abi, signer)

      setContract(c)

      
    }, [account, library, chainId])

    return contract;
}

export function TokenBalance({balance, decimals}){
  if (!balance) {
    return <div>...</div>
  }
  return (
      <span>
        {Math.round(parseFloat(formatUnits(balance, decimals))* 100) / 100}
      </span>
  )
}
