import { useState, useEffect } from 'react'
import {decimalFormat, dinamicFixed, calcTokenByShares} from '../eth/helpers';
import { useSelector } from 'react-redux';


export default function UserBalance(props) {
    
  const vaultStore = useSelector((state) => state.vault);
  const tokenStore = useSelector((state) => state.token);
    useEffect(() => {
    })
    const userToken = calcTokenByShares(vaultStore.balanceOf.value, vaultStore.totalSupply.value,vaultStore.totalAmounts.value[0],vaultStore.totalAmounts.value[1])
    
    return (
        <div>
            <div className="element">
                <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>Your balance:
                <span style={{color: 'green'}}>{decimalFormat(vaultStore.balanceOf.value, vaultStore.decimals)}</span></label>
            </div>
            <div className="row main-container">
                <div class="col-6">
                    <div className="element">                    
                        <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>Your balance Weth:
                        <span style={{color: 'green'}}>{dinamicFixed(decimalFormat(dinamicFixed(userToken[0], 0), tokenStore.decimalsEth),4)}</span></label>
                    </div>
                </div>
                <div class="col-6">
                    <div className="element">
                        <label className="paste-label" style={{textAlign: 'center', width: "100%"}}>Your balance Dai: 
                        <span style={{color: 'green'}}>{dinamicFixed(decimalFormat(dinamicFixed(userToken[1], 0), tokenStore.decimalsDai),4)}</span></label>
                    </div>
                </div>
            </div>
        </div>
    )
}