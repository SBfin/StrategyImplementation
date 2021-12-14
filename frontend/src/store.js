import { configureStore } from "@reduxjs/toolkit";
import vaultReducer from "./components/common/vault";
import tokenReducer from "./components/common/TokenBalance";
import strategyReducer from "./components/common/strategy";

export const store = configureStore({
  reducer: {
    vault: vaultReducer,
    token: tokenReducer,
    strategy: strategyReducer,
  },
});
