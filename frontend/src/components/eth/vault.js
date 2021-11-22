import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import UniVault from "./abi/UniVault.json";
import {Contract} from "@ethersproject/contracts";
import {formatUnits} from "@ethersproject/units";
import { decimalFormat } from './helpers';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';


const initialState = {
  totalSupply: {
      value: 0,
      status: 'idle',
  },
  totalAmounts: {
      value: [0, 0],
      status: 'idle',
  },
  balanceOf: {
    value: 0,
    status: 'idle'
  },
  decimals: 0,

};

export const fetchActions = {
    totalSupply: createAsyncThunk(
      'vault/fetchTotalSupply',
      async (vault) => {
         const totalSupply = await vault.totalSupply();
         return totalSupply.toString();
    }),
    totalAmounts: createAsyncThunk(
      'vault/fetchTotalAmounts',
      async (vault) => {
         const totalAmounts = await vault.getTotalAmounts();
         return [totalAmounts[0].toString(), totalAmounts[1].toString()];
    }),
    balanceOf: createAsyncThunk(
      'vault/fetchBalanceOf',
      async(data) => {
        const { account, vault } = data
        console.log('balanceOf')
        const balanceOf = await vault.balanceOf(account);
        return balanceOf.toString();
    }),
};

export const vaultSlice = createSlice({
    name: 'vault',
    initialState,
    reducers: {
        decimals: (state, action) => {
          state.decimals = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
          .addCase(fetchActions.totalAmounts.pending, (state) => {
            state.totalAmounts.status = 'loading';
          })
          .addCase(fetchActions.totalAmounts.fulfilled, (state, action) => {
            state.totalAmounts.status = 'idle';
            state.totalAmounts.value = action.payload;
          })

          .addCase(fetchActions.totalSupply.pending, (state) => {
            state.totalSupply.status = 'loading';
          })
          .addCase(fetchActions.totalSupply.fulfilled, (state, action) => {
            state.totalSupply.status = 'idle';
            state.totalSupply.value = action.payload;
          })

          .addCase(fetchActions.balanceOf.pending, (state) => {
            state.balanceOf.status = 'loading'
          })
          .addCase(fetchActions.balanceOf.fulfilled, (state, action) => {
            state.balanceOf.status = 'idle'
            state.balanceOf.value = action.payload
          })
    },
});
export default vaultSlice.reducer;

export function GetVault(address) {
  const {account, library, chainId} = useWeb3React()

  const [vault, setVault] = useState()

  useEffect(() => {
    console.log("loading contract")
    if (!(!!account || !!library) || !address) {
      return
    }
    
    const signer = library.getSigner(account).connectUnchecked()
    const contract = new Contract(address, UniVault.abi, signer)

    const filterFrom = contract.filters.Transfer(account);
    contract.on(filterFrom, (from, to, amount, event) => {
      // The `from` will always be the signer address,  more info: https://docs.ethers.io/v5/api/contract/example/
      // TODO: check and reload things from here
        console.log(from, to, amount, event)
    });

    setVault(contract)
  }, [address, library, chainId])
  return vault
}

export async function Deposit(vault, val1, val2) {
  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  
  return vault.deposit(val1.toString(), val2.toString(), 0, 0, accounts[0]).then((r) => {
     //setResult(r.toString());
     console.log(r);
     return r.wait();
  }).then((r) => {
    console.log("confirmed");
    console.log(r);
  }).catch((err) => {
      console.log(err);
  }) 
}

export async function Withdraw(vault, shares) {
  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  
  return vault.withdraw(shares.toString(), 0, 0, accounts[0]).then((r) => {
     console.log(r);
     return r.wait();
  }).then((r) => {
    console.log("confirmed");
    console.log(r);
  }).catch((err) => {
      console.log(err);
  })
}
