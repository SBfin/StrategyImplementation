import "./Nav.scss";
import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { useEagerConnect, useInactiveListener } from "../../helpers/hooks";
import { MetaMask } from "../../helpers/connector";

export default function Nav() {
  const web3React = useWeb3React();
  const { connector, account, activate } = web3React;

  const [activatingConnector, setActivatingConnector] = useState();
  useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined);
    }
  }, [activatingConnector, connector]);

  const triedEager = useEagerConnect();
  useInactiveListener(!triedEager || !!activatingConnector);

  const shortAccount = account && `${account.slice(0, 10)}...${account.slice(account.length - 4, account.length)}`;

  // TODO: list other connectors
  return (
    <nav>
      <div className="left">
        <div className="logo">
          {" "}
          <img className="img" src="./assets/Orbit_GIF.gif" />
        </div>
      </div>
      <div className="right">
        <div className="wallet-info-section">
          <span className="wallet-info-content">SELECT NETWORK &#9662;</span>
        </div>
        <div className="wallet-info-section">
          {!account ? (
            <span
              className="wallet-info-content"
              onClick={() => {
                setActivatingConnector(MetaMask);
                activate(MetaMask);
              }}
            >
              CONNECT WALLET
            </span>
          ) : (
            <span className="wallet-info-content">{shortAccount}</span>
          )}
        </div>
      </div>
    </nav>
  );
}
