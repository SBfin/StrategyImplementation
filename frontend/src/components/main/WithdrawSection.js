import { useState, useEffect } from 'react'
import {connect} from "react-redux";
import {Deposit,Withdraw} from '../eth/vault';
import {fromUnitsToDecimal, validateNumber, truncateNumber, FetchContract} from '../eth/helpers';
import {TokenBalance,Token,fetchActionsToken, tokenSlice, fetchAllToken, GetToken} from '../eth/TokenBalance';
import { useSelector, useDispatch } from 'react-redux';
import Loader from '../loader/Loader';
import { useWeb3React } from '@web3-react/core'
import UserBalance from '../user/UserBalance'

const mapState = state => ({
    tokenStore : state.token,
    vaultStore : state.vault,
});

const mapDispatchToProps = (dispatch, ownProps) => ({
})

function WithdrawSection(props) {
    const {tokenStore, vaultStore,  vault} = props;

    const [loader, setLoader] = useState(false);
    const [shares, setShares] = useState('');

    const onWithdrawClick = async () => {
        setLoader(true);
        const val = parseFloat(shares) * Math.pow(10,vaultStore.decimals)
        await Withdraw(vault, val)
        setLoader(false);
    }

    return (
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
    );
}


export default connect(mapState, mapDispatchToProps)(WithdrawSection)
