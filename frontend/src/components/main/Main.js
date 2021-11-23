import Loader from '../loader/Loader';
import {TokenBalance,Balance,Token,Decimals,Allowance,Approve,fetchActionsToken, tokenSlice} from '../eth/TokenBalance';
import EthBalance from '../eth/EthBalance';
import {TotalSupply,GetVault,GetStrategy, Deposit,Withdraw} from '../eth/vault';
import { useState, useEffect } from 'react'
import {ContractAddress} from '../../helpers/connector';
import { useSelector, useDispatch } from 'react-redux';
import {vaultSlice,fetchActionsVault} from '../eth/vault';
import './Main.scss';
import { useWeb3React } from '@web3-react/core'
import {decimalFormat} from '../eth/helpers';

const DEFAULT_BUTTON_TEXT = 'Approve';
const ENTER_KEY_CODE = 'Enter';

export default function Main(props) {
  const {account, library, chainId} = useWeb3React();

  const vaultStore = useSelector((state) => state.vault);
  const tokenStore = useSelector((state) => state.token)
  const dispatch = useDispatch();

  const isButtonDisabled = props.fetching;
  const vaultContractAddress = ContractAddress("vault")
  const vault = GetVault(vaultContractAddress)
  const vaultDecimals = Decimals(vault)

  useEffect(() => {
     if(!vault){
        return
     }
     console.log("selected contract: ", vault.address)
     dispatch(fetchActionsToken.decimals(vault)).then(r => dispatch(vaultSlice.actions.decimals(r.payload)))

     dispatch(fetchActionsVault.totalSupply(vault));
     dispatch(fetchActionsVault.totalAmounts(vault));
     dispatch(fetchActionsVault.balanceOf({account, vault}));
     dispatch(fetchActionsToken.allowance(vault, account, eth))

  }, [vault]);

  const eth = Token(ContractAddress("eth"))
  const ethDecimals = Decimals(eth)
  const ethBalance = Balance(eth)
  console.log(tokenStore)
  
  const dai = Token(ContractAddress("dai"))
  const daiDecimals = Decimals(dai)
  const daiBalance = Balance(dai)
  const daiAllowance = fetchActionsToken.allowance(vault, account, dai)
  
  
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [shares, setShares] = useState('');

  const [loader, setLoader] = useState(false);

  const onDepositClick = async () => {
    console.log('deposit')
    setLoader(true);
    const val1 = parseFloat(input1 || 0) * Math.pow(10,ethDecimals)
    const val2 = parseFloat(input2 || 0) * Math.pow(10,daiDecimals)
    console.log(vault)
    console.log(val2)
    console.log(typeof val2)
    await Deposit(vault, val1, val2)
    setLoader(false);
  }
  const onWithdrawClick = async () => {
    setLoader(true);
    const val = parseFloat(shares) * Math.pow(10,vaultDecimals)
    await Withdraw(vault, val)
    window.location.reload(false);
  }
  const onApproveClick = async (contract, balance) => {
    setLoader(true);
    await Approve(contract, vault, balance)
    window.location.reload(false);
  }

  return (
    <div style={{textAlign: 'center', width: "50%"}}>
      <span>Total Amounts: {vaultStore.totalAmounts.value[0]} eth, {vaultStore.totalAmounts.value[1]} dai</span>

      { vaultContractAddress==null &&
      <div className="main-container" style={{background: 'red'}}>
        <div>THIS CURRENT IS NOT SUPPORTED</div>
        <div>Please select a supported one</div>
      </div>
      }
      <div className="main-container">
        

        <div className="element">
          <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>ETH/DAI Vault Supply: 
          <span style={{color: 'green'}}> {decimalFormat(vaultStore.totalSupply.value, vaultStore.decimals)}</span></label>
        </div>
        
        <div className="element">
          <label className="paste-label" style={{lineHeight: '3em'}}>WETH</label>
          <input
            type="text"
            placeholder="0.0"
            className="address-input"
            disabled={ props.fetching }
            value={input1}
            onChange={ (e) => setInput1(e.target.value) }
          />
          <label style={{padding: "1em"}}>Your balance: <TokenBalance balance={ethBalance} decimals={ethDecimals} /></label>
        </div>
        
        

        <div className="element">
          <label className="paste-label" style={{lineHeight: '3em'}}>DAI</label>
          <input
            type="text"
            placeholder="0.0"
            className="address-input"
            disabled={ props.fetching }
            value={input2}
            onChange={ (e) => setInput2(e.target.value) }
          />

          <label style={{padding: "1em"}}>Your balance: <TokenBalance balance={daiBalance} decimals={daiDecimals} /></label>
        </div>
      
        <div className="element">
          { tokenStore.allowance.value == '0' &&
          <button
            className={`search-button ${isButtonDisabled ? 'search-button-clicked' : '' }`}
            onClick={ () => onApproveClick(eth, ethBalance) }
            disabled={ isButtonDisabled }
          >
            Approve WETH
          </button>
         }
          {daiAllowance == '0' ?
          <button
            className={`search-button ${isButtonDisabled ? 'search-button-clicked' : '' }`}
            onClick={ () => onApproveClick(dai, daiBalance) }
            disabled={ isButtonDisabled }
          >
            Approve DAI
          </button>
          :tokenStore.allowance.value !='0' && daiAllowance!='0' &&
          
          <button
            className={`search-button`}
            onClick={ onDepositClick }
            disabled={ isButtonDisabled }
          >
            Deposit
          </button> }
        </div>
        { loader &&  
          <div style={{textAlign: 'center', width: "100%"}}>
            <Loader />
          </div>  
        }
        
      </div>
      { vaultStore.balanceOf.value!==0 &&
      <div className="main-container">
        <div className="element">
            <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>Your balance: 
            <span style={{color: 'green'}}>{decimalFormat(vaultStore.balanceOf.value, vaultStore.decimals)}</span></label>
          </div>

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
            className={`search-button`}
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
