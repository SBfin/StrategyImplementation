import { useState, useEffect } from 'react'
import {decimalFormat, dinamicFixed, calcTokenByShares} from '../eth/helpers';
import { useSelector } from 'react-redux';
import {connect} from "react-redux";

const mapState = state => ({
    tokenStore : state.token,
    vaultStore : state.vault,
});

function UserBalance(props) {
    
    const {tokenStore, vaultStore} = props;

    const userToken = calcTokenByShares(vaultStore.balanceOf.value, vaultStore.totalSupply.value,vaultStore.totalAmounts.value[0],vaultStore.totalAmounts.value[1])
    
    return (
        <div>
            <div className="element">
                <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>Your balance:
                <span style={{color: 'green'}}>{decimalFormat(vaultStore.balanceOf.value, vaultStore.decimals)}</span></label>
            </div>
            <div className="row main-container">
                <div className="col-6">
                    <div className="element">                    
                        <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>Your balance {tokenStore.symbolToken0}:
                        <span style={{color: 'green'}}>{dinamicFixed(decimalFormat(dinamicFixed(userToken[0], 0), tokenStore.decimalsToken0),4)}</span></label>
                    </div>
                </div>
                <div className="col-6">
                    <div className="element">
                        <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>Your balance {tokenStore.symbolToken1}:
                        <span style={{color: 'green'}}>{dinamicFixed(decimalFormat(dinamicFixed(userToken[1], 0), tokenStore.decimalsToken1),4)}</span></label>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default connect(mapState)(UserBalance)
