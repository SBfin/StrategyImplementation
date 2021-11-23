import { configureStore } from '@reduxjs/toolkit';
import vaultReducer from './components/eth/vault';
import tokenReducer from './components/eth/TokenBalance'

export const store = configureStore({
  reducer: {
    vault: vaultReducer,
    token: tokenReducer
  },
});
