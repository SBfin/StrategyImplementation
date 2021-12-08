import Loader from '../loader/Loader';
import {TokenBalance,Token,fetchActionsToken, tokenSlice} from '../eth/TokenBalance';
import {GetVault,GetStrategy, Deposit,Withdraw, vaultSlice} from '../eth/vault';
import { Strategy } from '../eth/strategy';
import { useState, useEffect } from 'react'
import {ContractAddress} from '../../helpers/connector';
import { useSelector, useDispatch } from 'react-redux';
import './Main.scss';
import { useWeb3React } from '@web3-react/core'
import {decimalFormat, fetchAll, calculateRatio, validateNumber, dinamicFixed} from '../eth/helpers';
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import UserBalance from '../user/UserBalance'
import DepositSection from './DepositSection'


const DEFAULT_BUTTON_TEXT = 'Approve';
const ENTER_KEY_CODE = 'Enter';


export default function Main(props) {
  const {account, library, chainId} = useWeb3React();

  const vaultStore = useSelector((state) => state.vault);
  const tokenStore = useSelector((state) => state.token);
  const strategyStore = useSelector((state) => state.strategy)
  const dispatch = useDispatch();

  const [loader, setLoader] = useState(false);
  const [shares, setShares] = useState('');

  const vaultContractAddress = ContractAddress("vault")
  const vault = GetVault(vaultContractAddress)

  useEffect(() => {
     if(!vault){
        return
     }
     console.log("selected contract: ", vault.address)

     fetchAll(account, vault, dispatch)
    }, [vault]);


  const onWithdrawClick = async () => {
    setLoader(true);
    const val = parseFloat(shares) * Math.pow(10,vaultStore.decimals)
    await Withdraw(vault, val)
    window.location.reload(false);
  }  

  return (
    <div style={{textAlign: 'center', width: "50%"}}>

      { vaultContractAddress==null &&
      <div className="main-container" style={{background: 'red'}}>
        <div>THIS CURRENT IS NOT SUPPORTED</div>
        <div>Please select a supported one</div>
      </div>
      }
      <div className="main-container">
        <DepositSection vault={vault} />
      </div>
      
      
      <div className="row main-container">

        <div className="col-6">
          <div className="element">
              <label className="paste-label fs-2"  style={{textAlign: 'center', width: "100%"}}>Holdings</label>
          </div>
            <div className="element">
                <label className="paste-label fs-6" style={{textAlign: 'center', width: "100%"}}>Weth deposited: &nbsp;
                <span style={{color: 'green'}}>{dinamicFixed(decimalFormat(vaultStore.totalAmounts.value[0], tokenStore.decimalsToken0), 5)} Weth</span></label>
            </div>
            <div className="element">
                <label className="paste-label fs-6" style={{textAlign: 'center', width: "100%"}}>Dai deposited: &nbsp;
                <span style={{color: 'green'}}>{dinamicFixed(decimalFormat(vaultStore.totalAmounts.value[1], tokenStore.decimalsToken1),5)} Dai</span></label>
            </div>
            <div className="element">
                <label className="paste-label fs-6" style={{textAlign: 'center', width: "100%"}}>Weth & Dai Ratio &nbsp;
                <span style={{color: 'green'}}>{calculateRatio(decimalFormat(vaultStore.totalAmounts.value[0], tokenStore.decimalsToken0), decimalFormat(vaultStore.totalAmounts.value[1], tokenStore.decimalsToken1))}</span></label>
            </div>
            <div className="element">
              <label className="paste-label fs-6" style={{textAlign: 'center', width: "100%"}}>ETH/DAI Vault total shares: &nbsp;
              <span style={{color: 'green'}}> {dinamicFixed(decimalFormat(vaultStore.totalSupply.value, vaultStore.decimals),5)}</span></label>
            </div>
            <div className="element">
              <label className="paste-label fs-6" style={{textAlign: 'center', width: "100%"}}>DAI/WETH price: &nbsp;
              <span style={{color: 'green'}}> {strategyStore.price.value}</span></label>
            </div>
          </div>
          <div class="col-6">
            <div className="element">
              <label className="paste-label fs-2" style={{textAlign: 'center', width: "100%"}}>Deposit Cap</label>
            </div>
            <div className="element">
                <label className="paste-label fs-6" style={{textAlign: 'center', width: "100%"}}>% of the cap used: &nbsp;
                <span style={{color: 'green'}}>{(((vaultStore.totalSupply.value || 0 )/(vaultStore.maxTotalSupply.value || 0)) * 100).toFixed(2)}%</span></label>
            </div>

            <div className="element">
              <label className="paste-label fs-2" style={{textAlign: 'center', width: "100%"}}>Vault position</label>
            </div>
            <div className="element">
              <label className="paste-label fs-6" style={{textAlign: 'center', width: "100%"}}>Base order: &nbsp;
              <span style={{color: 'green'}}> {vaultStore.baseOrder.value[0] + ' - ' + vaultStore.baseOrder.value[1]} </span></label>
            </div>
            <div className="element">
              <label className="paste-label fs-6" style={{textAlign: 'center', width: "100%"}}>Limit order: &nbsp;
              <span style={{color: 'green'}}> {vaultStore.limitOrder.value[0] + ' - ' + vaultStore.limitOrder.value[1]} </span></label>
            </div>

            <div className="element">
              <label className="paste-label fs-2" style={{textAlign: 'center', width: "100%"}}>Contracts</label>
            </div>
            <div className="element">
              <label className="paste-label fs-6" style={{textAlign: 'center', width: "100%"}}>Vault: &nbsp;
              <span style={{color: 'green', wordWrap: 'break-word'}}> {vaultStore.address}</span></label>
            </div>
            <div className="element">
              <label className="paste-label fs-6" style={{textAlign: 'center', width: "100%"}}>Strategy: &nbsp;
              <span style={{color: 'green', wordWrap: 'break-word'}}> {vaultStore.strategyAddress.value}</span></label>
            </div>
          </div>
          

          
      </div>


      { vaultStore.balanceOf.value>0 &&
      <div className="main-container">
        <UserBalance />
          <div className="element">
            <label className="paste-label" style={{lineHeight: '3em'}}>Shares</label>
            <input
              type="text"
              placeholder="0.0"
              className="address-input"
              disabled={ props.fetching }
              value={shares}
              onChange={ (e) => setShares(e.target.value) }
            />
          </div>

          <div className="element">
          <button
            className="btn btn-primary col-12 btn-lg"
            onClick={ onWithdrawClick }
          >
            Withdraw
          </button> 
          </div>
      </div>
      }
    </div>
  );
}
