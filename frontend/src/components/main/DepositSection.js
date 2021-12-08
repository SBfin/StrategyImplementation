import { useState, useEffect } from 'react'
import {connect} from "react-redux";
import {Deposit,Withdraw} from '../eth/vault';
import {decimalFormat, calculateRatio, validateNumber, dinamicFixed, FetchContract} from '../eth/helpers';
import {TokenBalance,Token,fetchActionsToken, tokenSlice, fetchAllToken, GetToken} from '../eth/TokenBalance';
import { useSelector, useDispatch } from 'react-redux';
import Loader from '../loader/Loader';
import { useWeb3React } from '@web3-react/core'

const mapState = state => ({
    tokenStore : state.token,
    token0Address: state.vault.token0Address,
    token1Address: state.vault.token1Address,
    vaultTotalAmounts: state.vault.totalAmounts.value
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  // TODO: move actions on state here
  //toggleTodo: () => dispatch(toggleTodo(ownProps.todoId)),
})

function DepositSection(props) {
    const {tokenStore, vault, token0, token1, token0Address, token1Address, vaultTotalAmounts} = props;

    const dispatch = useDispatch();
    const {account, library, chainId} = useWeb3React();

    const [input1, setInput1] = useState('');
    const [input2, setInput2] = useState('');
    const [disable, setDisable] = useState(true)
    const [messageError, setMessageError] = useState('Deposit')

    const [loader, setLoader] = useState(false);
    const isButtonDisabled = props.fetching;

    const onDepositClick = async () => {
        setLoader(true);
        const val1 = parseFloat(input1 || 0) * Math.pow(10, tokenStore.decimalsToken0)
        const val2 = parseFloat(input2 || 0) * Math.pow(10, tokenStore.decimalsToken1)
        Deposit(vault, val1, val2)
        setLoader(false);
    }

    const token0Contract = GetToken(token0Address);
    const token1Contract = GetToken(token1Address);

    fetchAllToken(account, token0Contract, dispatch, "0", vault, vaultTotalAmounts);
    fetchAllToken(account, token1Contract, dispatch, "1", vault, vaultTotalAmounts);

    return (
     <div>
        <div className="element">
          <label className="paste-label" style={{lineHeight: '3em'}}>{tokenStore.symbolToken0}</label>
          <input
            type="text"
            placeholder="0.0"
            className="address-input"
            value={input1}
            onChange={ (e) =>  {
              setInput1(e.target.value)
              setInput2(dinamicFixed(e.target.value / tokenStore.ratioToken, 5))
              const validate = validateNumber(e.target.value,  e.target.value / tokenStore.ratioToken,
                decimalFormat(tokenStore.balanceToken0, tokenStore.decimalsToken0),
                decimalFormat(tokenStore.balanceToken1, tokenStore.decimalsToken1))
              if(validate){
                setDisable(true);
                setMessageError(validate)
              } else {
                setDisable(false)
              }}}
          />
          <label style={{padding: "1em"}}>Your balance: <TokenBalance balance={tokenStore.balanceToken0} decimals={tokenStore.decimalsToken0} /></label>
        </div>

        <div className="element">
          <label className="paste-label" style={{lineHeight: '3em'}}>{tokenStore.symbolToken1}</label>
          <input
            type="text"
            placeholder="0.0"
            className="address-input"
            disabled={ props.fetching }
            value={input2}
            onChange={ (e) => {
              setInput2(e.target.value)
              setInput1(dinamicFixed(e.target.value * tokenStore.ratioToken, 5))
              const validate = validateNumber(e.target.value * tokenStore.ratioToken,e.target.value,
                decimalFormat(tokenStore.balanceToken0, tokenStore.decimalsToken0),
                decimalFormat(tokenStore.balanceToken1, tokenStore.decimalsToken1))
              if(validate){
                setDisable(true);
                setMessageError(validate)
              } else {
                setDisable(false)
              }}}
          />

          <label style={{padding: "1em"}}>Your balance: <TokenBalance balance={tokenStore.balanceToken1} decimals={tokenStore.decimalsToken1} /></label>
        </div>

        <div className="element">
          { tokenStore.allowanceToken0 == '0' &&
          <button
            className={`search-button ${isButtonDisabled ? 'search-button-clicked' : '' }`}
            onClick={ () => dispatch(fetchActionsToken.approve({vault, contract: token0Contract})).then(r => dispatch(tokenSlice.actions.allowanceToken0(r.payload)))}
            disabled={ isButtonDisabled }
          >
            Approve {tokenStore.symbolToken0}
          </button>
         }
          {tokenStore.allowanceToken1 == '0' ?
          <button
            className={`search-button ${isButtonDisabled ? 'search-button-clicked' : '' }`}
            onClick={ () => dispatch(fetchActionsToken.approve({vault, contract: token1Contract})).then(r => dispatch(tokenSlice.actions.allowanceToken1(r.payload)))}
            disabled={ isButtonDisabled }
          >
            Approve {tokenStore.symbolToken1}
          </button>
          :tokenStore.allowanceToken0 !='0' && tokenStore.allowanceToken1 !='0' &&

          <button
            className="btn btn-primary col-12 btn-lg"
            onClick={ onDepositClick }
            disabled={ disable }
          >
            {disable && <span>{messageError}</span>  }
            {!disable && <span>Deposit</span>}
          </button> }
        </div>
        { loader &&
          <div style={{textAlign: 'center', width: "100%"}}>
            <Loader />
          </div>
        }
     </div>
    );
}


export default connect(mapState, mapDispatchToProps)(DepositSection)