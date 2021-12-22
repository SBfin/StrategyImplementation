import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { formatEther } from "@ethersproject/units";
import { useSelector } from "react-redux";

export default function EthBalance() {
  const { account, library, chainId } = useWeb3React();
  const vaultStore = useSelector((state) => state.vault);

  const [balance, setBalance] = useState();

  useEffect(() => {
    if (!!account && !!library) {
      let stale = false;

      library
        .getBalance(account)
        .then((res) => {
          if (!stale) {
            setBalance(res);
          }
        })
        .catch(() => {
          if (!stale) {
            setBalance(null);
          }
        }, [vaultStore]);

      return () => {
        stale = true;
        setBalance(undefined);
      };
    }
  }, [account, library, chainId, vaultStore]);

  if (!balance) {
    return <span>...</span>;
  }
  return <span>{parseFloat(formatEther(balance)).toPrecision(4)}</span>;
}
