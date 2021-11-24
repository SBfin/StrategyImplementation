import Loader from '../loader/Loader';
import {TokenBalance,Token,fetchActionsToken, tokenSlice} from '../eth/TokenBalance';
import {GetVault,GetStrategy, Deposit,Withdraw} from '../eth/vault';
import { useState, useEffect } from 'react'
import {ContractAddress} from '../../helpers/connector';
import { useSelector, useDispatch } from 'react-redux';
import './Main.scss';
import { useWeb3React } from '@web3-react/core'
import {decimalFormat, fetchAll} from '../eth/helpers';

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

     fetchAll(account, vault, eth, dai, dispatch)
  }, [vault]);

  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [shares, setShares] = useState('');

  const [loader, setLoader] = useState(false);

  const onDepositClick = async () => {
    setLoader(true);
    const val1 = parseFloat(input1 || 0) * Math.pow(10, tokenStore.decimalsEth)
    const val2 = parseFloat(input2 || 0) * Math.pow(10, tokenStore.decimalsDai)
    const rep = await Deposit(vault, val1, val2)
    console.log(rep)
    setLoader(false);
  }
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
        

        <div className="element">
          <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>ETH/DAI Vault Supply:
          <span style={{color: 'green'}}>
              {decimalFormat(vaultStore.totalAmounts.value[0], tokenStore.decimalsEth)} eth,
                    {decimalFormat(vaultStore.totalAmounts.value[1], tokenStore.decimalsDai)} dai</span>
          </label>
        </div>
        <div className="element">
          <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>ETH/DAI Vault total shares:
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
            onClick={ () => dispatch(fetchActionsToken.approve({vault, contract: eth, balance: tokenStore.balanceEth})).then(r => dispatch(tokenSlice.actions.allowanceEth(r.payload)))}
            disabled={ isButtonDisabled }
          >
            Approve WETH 
          </button>
         }
          {tokenStore.allowanceDai == '0' ?
          <button
            className={`search-button ${isButtonDisabled ? 'search-button-clicked' : '' }`}
            onClick={ () => dispatch(fetchActionsToken.approve({vault, contract: dai, balance: tokenStore.balanceDai})).then(r => dispatch(tokenSlice.actions.allowanceDai(r.payload)))}
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
      
      
      <div className="main-container">
        <div className="element">
            <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>Weth deposited: &nbsp;
            <span style={{color: 'green'}}>{decimalFormat(vaultStore.totalAmounts.value[0], tokenStore.decimalsEth)} Weth</span></label>
        </div>
        <div className="element">
            <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>Dai deposited: &nbsp;
            <span style={{color: 'green'}}>{decimalFormat(vaultStore.totalAmounts.value[1], tokenStore.decimalsDai)} Dai</span></label>
        </div>

          

          <div className="element">
          <button
            className={`search-button`}
          >
            Nothing
          </button> 
          </div>
      </div>


      { vaultStore.balanceOf.value>0 &&
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
