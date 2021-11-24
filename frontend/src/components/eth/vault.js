import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import UniVault from "./abi/UniVault.json";
import {Contract} from "@ethersproject/contracts";
import {formatUnits} from "@ethersproject/units";
import { decimalFormat } from './helpers';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {fetchAll} from '../eth/helpers';
import { useDispatch } from 'react-redux';
import {Token} from '../eth/TokenBalance';
import {ContractAddress} from '../../helpers/connector';

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

/*function getBalance0() public view returns (uint256) {
        return token0.balanceOf(address(this)).sub(accruedProtocolFees0);
    }*/

export const fetchActionsVault = {
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
          .addCase(fetchActionsVault.totalAmounts.pending, (state) => {
            state.totalAmounts.status = 'loading';
          })
          .addCase(fetchActionsVault.totalAmounts.fulfilled, (state, action) => {
            state.totalAmounts.status = 'idle';
            state.totalAmounts.value = action.payload;
          })

          .addCase(fetchActionsVault.totalSupply.pending, (state) => {
            state.totalSupply.status = 'loading';
          })
          .addCase(fetchActionsVault.totalSupply.fulfilled, (state, action) => {
            state.totalSupply.status = 'idle';
            state.totalSupply.value = action.payload;
          })

          .addCase(fetchActionsVault.balanceOf.pending, (state) => {
            state.balanceOf.status = 'loading'
          })
          .addCase(fetchActionsVault.balanceOf.fulfilled, (state, action) => {
            state.balanceOf.status = 'idle'
            state.balanceOf.value = action.payload
          })
    },
});
export default vaultSlice.reducer;

export function GetVault(address) {
  const {account, library, chainId} = useWeb3React()
  const [vault, setVault] = useState()
  const eth = Token(ContractAddress("eth"))
  const dai = Token(ContractAddress("dai"))
  const dispatch = useDispatch()

  useEffect(() => {
    console.log("loading contract")
    if (!(!!account || !!library) || !address) {
      return
    }
    
    const signer = library.getSigner(account).connectUnchecked()
    const contract = new Contract(address, UniVault.abi, signer)

    // more info: https://docs.ethers.io/v5/api/contract/example/
    if (eth && dai && contract && account && dispatch){
        const filterTo = contract.filters.Transfer(null, account)
        library.on(filterTo, (from, to, amount, event) => {
            console.log('Vault|Interaction', {from, to, amount, event})
            fetchAll(account, contract, eth, dai, dispatch)
        })
    }

    setVault(contract)
  }, [address, library, chainId, eth, dai])
  return vault
}

export async function Deposit(vault, val1, val2) {
  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  console.log('deposit - vault.js')
  console.log(accounts[0])
  console.log(val1)
  console.log(val2)

  return vault.deposit(val1.toString(), val2.toString(), 0, 0, accounts[0], {from: accounts[0], gasLimit: 1000000}).then((r) => {
     //setResult(r.toString());
     console.log('deposit function')
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
