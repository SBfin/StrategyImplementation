import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import DynamicRangesStrategy from "./abi/DynamicRangesStrategy.json";
import {Contract} from "@ethersproject/contracts";
import {formatUnits} from "@ethersproject/units";
import { decimalFormat } from './helpers';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {fetchAll} from '../eth/helpers';
import { useDispatch } from 'react-redux';
import {ContractAddress} from '../../helpers/connector';

const initialState = {
    tickValue: {
        value: 0,
        status: 'idle',
    },
  };
  
  export const fetchActionsStrategy = {
    tickValue: createAsyncThunk(
        'strategy/fetchTickValue',
        async (strategy) => {
           const tickValue = await strategy.getTick();
           return tickValue.toString();
      }),
  };
  
  export const strategySlice = createSlice({
      name: 'strategy',
      initialState,
      reducers: {
          
      },
      extraReducers: (builder) => {
          
        builder
          .addCase(fetchActionsStrategy.tickValue.pending, (state) => {
              console.log('pending')
            state.tickValue.status = 'loading';
          })
          .addCase(fetchActionsStrategy.tickValue.fulfilled, (state, action) => {
            state.tickValue.status = 'idle';
            state.tickValue.value = action.payload;
            
          })
           
      },
  });
  export default strategySlice.reducer;

  export function Strategy(address) {
    const {account, library, chainId} = useWeb3React()
    const [strategy, setStrategy] = useState()
  
    useEffect(() => {
      console.log("loading contract")
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