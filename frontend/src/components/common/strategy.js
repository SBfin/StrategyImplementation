import { useState, useEffect } from "react";
import { useWeb3React } from "@web3-react/core";
import DynamicRangesStrategy from "./abi/DynamicRangesStrategy.json";
import { Contract } from "@ethersproject/contracts";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { tickToPrice, truncateNumber } from "./helpers";

const initialState = {
  price: {
    value: 0,
    status: "idle",
  },
  tick: {
    value: 0,
    status: "idle",
  },
};

export const fetchActionsStrategy = {
  price: createAsyncThunk("strategy/fetchPrice", async (data) => {
    const { strategy, decimals0, decimals1 } = data;
    const tickValue = await strategy.getTick();
    const price = tickToPrice(tickValue, decimals0, decimals1).toString();
    return truncateNumber(1 / price, 2);
  }),
  tick: createAsyncThunk("strategy/fetchTick", async (data) => {
    const { strategy } = data;
    const tickValue = await strategy.getTick();
    return tickValue;
  }),
};

export const strategySlice = createSlice({
  name: "strategy",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActionsStrategy.price.pending, (state) => {
        state.price.status = "loading";
      })
      .addCase(fetchActionsStrategy.price.fulfilled, (state, action) => {
        state.price.status = "idle";
        state.price.value = action.payload;
      })

      .addCase(fetchActionsStrategy.tick.pending, (state) => {
        state.tick.status = "loading";
      })
      .addCase(fetchActionsStrategy.tick.fulfilled, (state, action) => {
        state.tick.status = "idle";
        state.tick.value = action.payload;
      });
  },
});
export default strategySlice.reducer;

export function loadStrategy(account, library, address) {
  if (!account || !library || !address) {
    return;
  }
  const signer = library.getSigner(account).connectUnchecked();
  return new Contract(address, DynamicRangesStrategy.abi, signer);
}

export function GetStrategy(address) {
  const { account, library, chainId } = useWeb3React();

  const [contract, setContract] = useState();

  useEffect(async () => {
    setContract(loadStrategy(account, library, address));
  }, [account, library, chainId, address]);

  return contract;
}
