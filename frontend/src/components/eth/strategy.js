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
    twap: {
        value: 0,
        status: 'idle',
    },
  };
  
  export const fetchActionsStrategy = {
    twap: createAsyncThunk(
        'strategy/fetchTwap',
        async (strategy) => {
           const twap = await strategy.getTick();
           return twap.toString();
      }),
  };
  
  export const strategySlice = createSlice({
      name: 'strategy',
      initialState,
      reducers: {
          
      },
      extraReducers: (builder) => {
          
        builder
          .addCase(fetchActionsStrategy.twap.pending, (state) => {
              console.log('pending')
            state.twap.status = 'loading';
          })
          .addCase(fetchActionsStrategy.twap.fulfilled, (state, action) => {
            state.twap.status = 'idle';
            state.twap.value = action.payload;
            
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