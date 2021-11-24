import Loader from '../loader/Loader';
import {TokenBalance,Token,Approve,fetchActionsToken, tokenSlice} from '../eth/TokenBalance';
import {GetVault,GetStrategy, Deposit,Withdraw} from '../eth/vault';
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
  const eth = Token(ContractAddress("eth"))
  const dai = Token(ContractAddress("dai"))

  useEffect(() => {
     if(!vault){
        return
     }
     console.log("selected contract: ", vault.address)

     dispatch(fetchActionsToken.decimals(vault)).then(r => dispatch(vaultSlice.actions.decimals(r.payload)))
     dispatch(fetchActionsVault.totalSupply(vault));
     dispatch(fetchActionsVault.totalAmounts(vault));
     dispatch(fetchActionsVault.balanceOf({account, vault}));
     
     dispatch(fetchActionsToken.decimals(eth)).then(r => dispatch(tokenSlice.actions.decimalsEth(r.payload)));
     dispatch(fetchActionsToken.decimals(dai)).then(r => dispatch(tokenSlice.actions.decimalsDai(r.payload)));

     dispatch(fetchActionsToken.balance({account,contract: eth})).then(r => dispatch(tokenSlice.actions.balanceEth(r.payload)));
     dispatch(fetchActionsToken.balance({account,contract: dai})).then(r => dispatch(tokenSlice.actions.balanceDai(r.payload)));
     dispatch(fetchActionsToken.allowance({vault, account, contract: eth})).then(r => dispatch(tokenSlice.actions.allowanceEth(r.payload)));
     dispatch(fetchActionsToken.allowance({vault, account, contract: dai})).then(r => dispatch(tokenSlice.actions.allowanceDai(r.payload)));

  }, [vault]);
  
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [shares, setShares] = useState('');

  const [loader, setLoader] = useState(false);

  const onDepositClick = async () => {
    setLoader(true);
    const val1 = parseFloat(input1 || 0) * Math.pow(10, tokenStore.decimalsEth)
    const val2 = parseFloat(input2 || 0) * Math.pow(10, tokenStore.decimalsDai)
    await Deposit(vault, val1, val2)
    setLoader(false);
  }
  const onWithdrawClick = async () => {
    setLoader(true);
    const val = parseFloat(shares) * Math.pow(10,vaultStore.decimals)
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
          <label style={{padding: "1em"}}>Your balance: <TokenBalance balance={tokenStore.balanceEth} decimals={tokenStore.decimalsEth} /></label>
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

          <label style={{padding: "1em"}}>Your balance: <TokenBalance balance={tokenStore.balanceDai} decimals={tokenStore.decimalsDai} /></label>
        </div>
      
        <div className="element">
          { tokenStore.allowanceEth == '0' &&
          <button
            className={`search-button ${isButtonDisabled ? 'search-button-clicked' : '' }`}
            onClick={ () => dispatch(fetchActionsToken.approve({vault, contract: eth, balance: input1})).then(r => dispatch(tokenSlice.actions.approveEth(r.payload)))}
            disabled={ isButtonDisabled }
          >
            Approve WETH
          </button>
         }
          {tokenStore.allowanceDai == '0' ?
          <button
            className={`search-button ${isButtonDisabled ? 'search-button-clicked' : '' }`}
            onClick={ () => dispatch(fetchActionsToken.approve({vault, contract: dai, balance: input2})).then(r => dispatch(tokenSlice.actions.approveDai(r.payload)))}
            disabled={ isButtonDisabled }
          >
            Approve DAI
          </button>
          :tokenStore.allowanceEth !='0' && tokenStore.allowanceDai !='0' &&
          
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
