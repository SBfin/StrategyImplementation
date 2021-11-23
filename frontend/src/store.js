import { configureStore } from '@reduxjs/toolkit';
import vaultReducer from './components/eth/vault';

export const store = configureStore({
  reducer: {
    vault: vaultReducer,
  },
});
