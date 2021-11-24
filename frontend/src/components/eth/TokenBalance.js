import {useWeb3React} from "@web3-react/core";
import {Web3Provider} from "@ethersproject/providers";
import React, {useEffect, useState} from "react";
import {Contract} from "@ethersproject/contracts";
import ERC20ABI from "./abi/MockToken.json";
import {formatUnits} from "@ethersproject/units";
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const initialState = {
  balanceEth: 0,
  balanceDai: 0,
  allowanceEth: 0,
  allowanceDai: 0,
  decimalsEth: 0,
  decimalsDai: 0,
  approveEth: 0,
  approveDai: 0

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
        const approve = await contract.approve(vault.address, balance);
        return approve.toString();
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
      approveEth: (state, action) => {
        state.approveEth = action.payload;
      },
      approveDai: (state, action) => {
        state.approveDai = action.payload;
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

      const fromMe = c.filters.Transfer(account, null)
      library.on(fromMe, (from, to, amount, event) => {
        console.log('Transfer|sent', {from, to, amount, event})
        //mutate(undefined, true)
      })
      const toMe = c.filters.Transfer(null, account)
      library.on(toMe, (from, to, amount, event) => {
        console.log('Transfer|received', {from, to, amount, event})
        //mutate(undefined, true)
      })
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
