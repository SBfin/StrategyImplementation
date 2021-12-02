import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import DynamicRangesStrategy from "./abi/DynamicRangesStrategy.json";
import {Contract} from "@ethersproject/contracts";
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { tickToPrice, dinamicFixed } from './helpers'

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
           return dinamicFixed(1 / price,2)
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
              console.log('pending')
            state.price.status = 'loading';
          })
          .addCase(fetchActionsStrategy.price.fulfilled, (state, action) => {
            state.price.status = 'idle';
            state.price.value = action.payload;
            
          })
           
      },
  });
  export default strategySlice.reducer;

  export function Strategy(address) {
    const {account, library, chainId} = useWeb3React()
    const [strategy, setStrategy] = useState()
  
    useEffect(() => {
      console.log("loading strategy contract")
      if (!(!!account || !!library) || !address) {
        return
      }
      
      const signer = library.getSigner(account).connectUnchecked()
      const contract = new Contract(address, DynamicRangesStrategy.abi, signer)
  
      // more info: https://docs.ethers.io/v5/api/contract/example/
  
      setStrategy(contract)
    }, [address, library, chainId])
    return strategy
  }