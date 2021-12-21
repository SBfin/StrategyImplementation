import { useState, useEffect } from "react";
import { useWeb3React } from "@web3-react/core";
import OrbitVault from "./abi/OrbitVault.json";
import { Contract } from "@ethersproject/contracts";
import { formatUnits } from "@ethersproject/units";
import { tickToPrice, truncateNumber } from "./helpers";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchAll } from "./helpers";
import { useDispatch } from "react-redux";
import { fetchActionsToken } from "./TokenBalance";

const initialState = {
  totalSupply: {
    value: 0,
    status: "idle",
  },
  totalAmounts: {
    value: [0, 0],
    status: "idle",
  },
  balanceOf: {
    value: 0,
    status: "idle",
  },
  base: [0, 0],
  limit: [0, 0],
  maxTotalSupply: {
    value: 0,
    status: "idle",
  },
  strategyAddress: {
    value: 0,
    status: "idle",
  },
  decimals: 0,
  address: 0,
  token0Address: "",
  token1Address: "",
};

export const fetchActionsVault = {
  totalSupply: createAsyncThunk("vault/fetchTotalSupply", async (vault) => {
    const totalSupply = await vault.totalSupply();
    return totalSupply.toString();
  }),
  totalAmounts: createAsyncThunk("vault/fetchTotalAmounts", async (vault) => {
    const totalAmounts = await vault.getTotalAmounts();
    return [totalAmounts[0].toString(), totalAmounts[1].toString()];
  }),
  balanceOf: createAsyncThunk("vault/fetchBalanceOf", async (data) => {
    const { account, vault } = data;
    const balanceOf = await vault.balanceOf(account);
    return balanceOf.toString();
  }),
  base: createAsyncThunk("vault/fetchBase", async (vault) => {
    const baseUpper = await vault.baseUpper.call();
    const baseLower = await vault.baseLower.call();
    return [baseLower.toString(), baseUpper.toString()];
  }),
  limit: createAsyncThunk("vault/fetchLimit", async (vault) => {
    const limitLower = await vault.limitLower.call();
    const limitUpper = await vault.limitUpper.call();
    return [limitLower.toString(), limitUpper.toString()];
  }),
  maxTotalSupply: createAsyncThunk("vault/fetchMaxTotalSupply", async (vault) => {
    const maxTotalSupply = await vault.maxTotalSupply.call();
    return maxTotalSupply.toString();
  }),
  strategyAddress: createAsyncThunk("vault/strategyAddress", async (vault) => {
    const strategyAddress = await vault.strategy.call();
    return strategyAddress.toString();
  }),
  token0Address: createAsyncThunk("vault/token0Address", async (vault) => {
    const address = await vault.token0.call();
    return address.toString();
  }),
  token1Address: createAsyncThunk("vault/token1Address", async (vault) => {
    const address = await vault.token1.call();
    return address.toString();
  }),
};

export const vaultSlice = createSlice({
  name: "vault",
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
        state.totalAmounts.status = "loading";
      })
      .addCase(fetchActionsVault.totalAmounts.fulfilled, (state, action) => {
        state.totalAmounts.status = "idle";
        state.totalAmounts.value = action.payload;
      })

      .addCase(fetchActionsVault.totalSupply.pending, (state) => {
        state.totalSupply.status = "loading";
      })
      .addCase(fetchActionsVault.totalSupply.fulfilled, (state, action) => {
        state.totalSupply.status = "idle";
        state.totalSupply.value = action.payload;
      })

      .addCase(fetchActionsVault.balanceOf.pending, (state) => {
        state.balanceOf.status = "loading";
      })
      .addCase(fetchActionsVault.balanceOf.fulfilled, (state, action) => {
        state.balanceOf.status = "idle";
        state.balanceOf.value = action.payload;
      })
      .addCase(fetchActionsVault.base.fulfilled, (state, action) => {
        state.base = action.payload;
      })
      .addCase(fetchActionsVault.limit.fulfilled, (state, action) => {
        state.limit = action.payload;
      })
      .addCase(fetchActionsVault.maxTotalSupply.pending, (state) => {
        state.maxTotalSupply.status = "loading";
      })
      .addCase(fetchActionsVault.maxTotalSupply.fulfilled, (state, action) => {
        state.maxTotalSupply.status = "idle";
        state.maxTotalSupply.value = action.payload;
      })
      .addCase(fetchActionsVault.strategyAddress.pending, (state) => {
        state.strategyAddress.status = "loading";
      })
      .addCase(fetchActionsVault.strategyAddress.fulfilled, (state, action) => {
        state.strategyAddress.status = "idle";
        state.strategyAddress.value = action.payload;
      })
      .addCase(fetchActionsVault.token0Address.fulfilled, (state, action) => {
        state.token0Address = action.payload;
      })
      .addCase(fetchActionsVault.token1Address.fulfilled, (state, action) => {
        state.token1Address = action.payload;
      });
  },
});
export default vaultSlice.reducer;

export function fetchAllVault(account, vault, dispatch) {
  if (!vault) {
    return;
  }
  dispatch(fetchActionsToken.decimals(vault)).then((r) => dispatch(vaultSlice.actions.decimals(r.payload)));
  dispatch(vaultSlice.actions.address(vault.address));

  dispatch(fetchActionsVault.strategyAddress(vault));
  dispatch(fetchActionsVault.token0Address(vault));
  dispatch(fetchActionsVault.token1Address(vault));

  dispatch(fetchActionsVault.balanceOf({ account, vault }));
  dispatch(fetchActionsVault.base(vault));
  dispatch(fetchActionsVault.limit(vault));
  dispatch(fetchActionsVault.maxTotalSupply(vault));
  dispatch(fetchActionsVault.totalAmounts(vault));
  dispatch(fetchActionsVault.totalSupply(vault));
}

export function GetVault(address) {
  const { account, library, chainId } = useWeb3React();
  const [vault, setVault] = useState();
  const dispatch = useDispatch();

  useEffect(() => {
    console.log("loading contract");
    if (!(!!account || !!library) || !address) {
      return;
    }
    const signer = library.getSigner(account).connectUnchecked();
    const contract = new Contract(address, OrbitVault.abi, signer);

    // more info: https://docs.ethers.io/v5/api/contract/example/
    if (contract && account && dispatch) {
      const filterTo = contract.filters.Transfer(null, account);
      library.on(filterTo, (from, to, amount, event) => {
        console.log("Vault|Interaction", { from, to, amount, event });
        fetchAllVault(account, contract, dispatch);
      });
      const filterFrom = contract.filters.Transfer(account, null);
      library.on(filterFrom, (from, to, amount, event) => {
        console.log("Vault|Interaction", { from, to, amount, event });
        fetchAllVault(account, contract, dispatch);
      });
    }

    setVault(contract);
  }, [address, library, chainId]);
  return vault;
}

export async function Deposit(vault, val1, val2, isEth, ethValue) {
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  console.log("deposit - vault.js");
  console.log(accounts[0]);
  console.log(val1);
  console.log(val2);
  console.log(isEth);
  console.log(ethValue);
  var vaultDep;

  if (isEth) {
    vaultDep = vault.depositEth(val1.toString(), 0, 0, accounts[0], { from: accounts[0], gasLimit: 1000000, value: val2.toString() });
  } else {
    vaultDep = vault.deposit(val1.toString(), val2.toString(), 0, 0, accounts[0], { from: accounts[0], gasLimit: 1000000 });
  }

  return vaultDep
    .then((r) => {
      //setResult(r.toString());
      console.log("deposit function");
      console.log(r);
      return r.wait();
    })
    .then((r) => {
      console.log("confirmed");
      console.log(r);
    })
    .catch((err) => {
      console.log(err);
    });
}

export async function Withdraw(vault, shares, ethWithdraw) {
  const accounts = await window.ethereum.request({ method: "eth_accounts" });

  var vaultWith = ethWithdraw ? vault.withdrawEth(shares.toString(), 0, 0, accounts[0]) : vault.withdraw(shares.toString(), 0, 0, accounts[0]);

  return vaultWith
    .then((r) => {
      console.log(r);
      return r.wait();
    })
    .then((r) => {
      console.log("confirmed");
      console.log(r);
    })
    .catch((err) => {
      console.log(err);
    });
}
