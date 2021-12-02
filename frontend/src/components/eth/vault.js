import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import UniVault from "./abi/UniVault.json";
import {Contract} from "@ethersproject/contracts";
import {formatUnits} from "@ethersproject/units";
import { decimalFormat, tickToPrice, dinamicFixed } from './helpers';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {fetchAll} from '../eth/helpers';
import { useDispatch } from 'react-redux';
import {Token} from '../eth/TokenBalance';
import { Strategy } from './strategy';
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
  baseOrder: {
    value: [0, 0],
    status: 'idle'
  },
  limitOrder: {
    value: [0, 0],
    status: 'idle'
  },
  maxTotalSupply: {
    value: 0,
    status: 'idle'
  },
  strategyAddress: {
    value: 0,
    status: 'idle'
  },
  decimals: 0,
  address: 0,

};

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
    baseOrder: createAsyncThunk(
      'vault/fetchBaseOrder',
      async(vault) => {
        const baseUpper = await vault.baseUpper.call()
        const baseLower = await vault.baseLower.call()
        return [ dinamicFixed(1/tickToPrice(baseLower,6,18),2),
                 dinamicFixed(1/tickToPrice(baseUpper,6,18),2) ]
    }),
    limitOrder: createAsyncThunk(
      'vault/fetchLimitOrder',
      async(vault) => {
        const limitUpper = await vault.baseUpper.call()
        const limitLower = await vault.baseLower.call()
        return [ dinamicFixed(1/tickToPrice(limitLower,6,18),2),
                 dinamicFixed(1/tickToPrice(limitUpper,6,18),2) ]
    }),
    maxTotalSupply: createAsyncThunk(
      'vault/fetchMaxTotalSupply',
      async(vault) => {
        const maxTotalSupply = await vault.maxTotalSupply.call()
        return maxTotalSupply.toString()
    }),
    strategyAddress: createAsyncThunk(
      'vault/strategyAddress',
      async(vault) => {
        const strategyAddress = await vault.strategy.call()
        return strategyAddress.toString();
    }),
};

export const vaultSlice = createSlice({
    name: 'vault',
    initialState,
    reducers: {
        decimals: (state, action) => {
          state.decimals = action.payload;
        },
        address: (state, action) => {
          state.address = action.payload;
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
          .addCase(fetchActionsVault.baseOrder.pending, (state) => {
            state.baseOrder.status = 'loading'
          })
          .addCase(fetchActionsVault.baseOrder.fulfilled, (state, action) => {
            state.baseOrder.status = 'idle'
            state.baseOrder.value = action.payload
          })
          .addCase(fetchActionsVault.limitOrder.pending, (state) => {
            state.limitOrder.status = 'loading'
          })
          .addCase(fetchActionsVault.limitOrder.fulfilled, (state, action) => {
            state.limitOrder.status = 'idle'
            state.limitOrder.value = action.payload
          })
          .addCase(fetchActionsVault.maxTotalSupply.pending, (state) => {
            state.maxTotalSupply.status = 'loading'
          })
          .addCase(fetchActionsVault.maxTotalSupply.fulfilled, (state, action) => {
            state.maxTotalSupply.status = 'idle'
            state.maxTotalSupply.value = action.payload
          })
          .addCase(fetchActionsVault.strategyAddress.pending, (state) => {
            state.strategyAddress.status = 'loading'
          })
          .addCase(fetchActionsVault.strategyAddress.fulfilled, (state, action) => {
            state.strategyAddress.status = 'idle'
            state.strategyAddress.value = action.payload
          })
    },
});
export default vaultSlice.reducer;

export function GetVault(address) {
  const {account, library, chainId} = useWeb3React()
  const [vault, setVault] = useState()
  const eth = Token(ContractAddress("eth"))
  const dai = Token(ContractAddress("dai"))
  const strategy = Strategy(ContractAddress("strategy"))
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
            fetchAll(account, contract, eth, dai, strategy, dispatch)
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
