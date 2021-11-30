import { configureStore } from '@reduxjs/toolkit';
import vaultReducer from './components/eth/vault';
import tokenReducer from './components/eth/TokenBalance'
import strategyReducer from './components/eth/strategy'

export const store = configureStore({
  reducer: {
    vault: vaultReducer,
    token: tokenReducer,
    strategy: strategyReducer,
  },
});
