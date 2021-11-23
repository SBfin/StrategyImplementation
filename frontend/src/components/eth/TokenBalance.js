import {useWeb3React} from "@web3-react/core";
import {Web3Provider} from "@ethersproject/providers";
import React, {useEffect, useState} from "react";
import {Contract} from "@ethersproject/contracts";
import ERC20ABI from "./abi/MockToken.json";
import {formatUnits} from "@ethersproject/units";
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const initialState = {
  balance: {
    value: 0,
    status: 'idle'
  },
  allowance: {
    value: 0,
    status: 'idle'
  },
  decimals: 0,

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

      }
    )
};

export const tokenSlice = createSlice({
  name: 'token',
  initialState,
  reducers: {
      decimals: (state, action) => {
        state.decimals = action.payload;
      },
  },
  extraReducers: (builder) => {
      builder
        .addCase(fetchActionsToken.balance.pending, (state) => {
          state.balance.status = 'loading';
        })
        .addCase(fetchActionsToken.balance.fulfilled, (state, action) => {
          state.balance.status = 'idle';
          state.balance.value = action.payload;
        })
        .addCase(fetchActionsToken.allowance.pending, (state) => {
          state.allowance.status = 'loading';
        })
        .addCase(fetchActionsToken.allowance.fulfilled, (state, action) => {
          state.allowance.status = 'idle';
          state.allowance.value = action.payload;
        })
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

export function Decimals(contract){
  const [decimals, setDecimals] = useState()

  useEffect(async () => {
    if (!contract) {
        return
    }
    contract.decimals()
        .then((result) => {
          console.log("Decimals: ", result.toString())
          setDecimals(result);
        }).catch((err) => {
            console.log(err);
        })      
  }, [contract])
  return decimals;
}

export function Allowance(contract, vault){
  const {account} = useWeb3React()
  const [result, setResult] = useState('0')

  useEffect(() => {
    if (!contract) {
        return
    }
    contract.allowance(account, vault.address)
        .then((r) => {
          setResult(r.toString());
        }).catch((err) => {
            console.log(err);
        })      
  }, [contract,account])
  return result;
}

export async function Approve(contract, vault, balance){

  return contract.approve(await vault.address, balance)
    .then((r) => {
      return r.wait();
    }).then((r) => {
      console.log("confirmed");
      console.log(r);
    }).catch((err) => {
        console.log(err);
    })      
}

export function Balance(contract){
  const {account, library, chainId} = useWeb3React()

  const [balance, setBalance] = useState()

  useEffect(async () => {
    if (!account || !contract) {
        return
    }
    contract.balanceOf(account)
        .then((balance) => {
          setBalance(balance.toString())
        }).catch((err) => {
          console.log(err);
          setBalance(null);
        })
  
  }, [account, contract])

  return balance;
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
