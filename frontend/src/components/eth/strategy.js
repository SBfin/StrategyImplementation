import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import DynamicRangesStrategy from "./abi/DynamicRangesStrategy.json";
import {Contract} from "@ethersproject/contracts";
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { tickToPrice, truncateNumber } from './helpers'

const initialState = {
    price: {
        value: 0,
        status: 'idle',
    },
  };
  
  export const fetchActionsStrategy = {
    price: createAsyncThunk(
        'strategy/fetchPrice',
        async (strategy) => {
           const tickValue = await strategy.getTick();
           const price = tickToPrice(tickValue,6,18).toString();
           return truncateNumber(1 / price,2)
      }),
  };
  
  export const strategySlice = createSlice({
      name: 'strategy',
      initialState,
      reducers: {
          
      },
      extraReducers: (builder) => {
          
        builder
          .addCase(fetchActionsStrategy.price.pending, (state) => {
            state.price.status = 'loading';
          })
          .addCase(fetchActionsStrategy.price.fulfilled, (state, action) => {
            state.price.status = 'idle';
            state.price.value = action.payload;
            
          })
           
      },
  });
export default strategySlice.reducer;

export function GetStrategy(address){
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
      const c = new Contract(address, DynamicRangesStrategy.abi, signer)

      setContract(c)


    }, [account, library, chainId, address])

    return contract;
}
