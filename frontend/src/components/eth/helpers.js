import {formatUnits} from "@ethersproject/units";
import { useSelector, useDispatch } from 'react-redux';
import {fetchActionsToken, tokenSlice, Token} from '../eth/TokenBalance';
import {vaultSlice,fetchActionsVault, GetVault} from '../eth/vault';
import {ContractAddress} from '../../helpers/connector';
import { useWeb3React } from '@web3-react/core'
import { createStore} from 'redux'


export function decimalFormat(number, decimals) {
    if(!number || !decimals){
        return 0;
    }
    return Math.round(parseFloat(formatUnits(number, parseInt(decimals))) * 100) / 100;
}

function gcd(num_1, num_2){
    if (num_2 === 0)
        return num_1
    else
        return gcd(num_2, num_1 % num_2)
}

export function calculateRatio(num_1, num_2) {
    const den = gcd(num_1, num_2);
    var ratio = num_1/den+":"+num_2/den;
    return ratio;
}

export function fetchAll(account, vault, eth, dai, dispatch) {
    

     dispatch(fetchActionsToken.decimals(vault)).then(r => dispatch(vaultSlice.actions.decimals(r.payload)))
     dispatch(vaultSlice.actions.address(vault.address))
     dispatch(fetchActionsVault.strategyAddress(vault));
     dispatch(fetchActionsVault.totalSupply(vault));
     dispatch(fetchActionsVault.balanceOf({account, vault}));
     dispatch(fetchActionsVault.baseOrder(vault));
     dispatch(fetchActionsVault.limitOrder(vault));
     dispatch(fetchActionsVault.maxTotalSupply(vault));

     dispatch(fetchActionsToken.decimals(eth)).then(r => dispatch(tokenSlice.actions.decimalsEth(r.payload)));
     dispatch(fetchActionsToken.decimals(dai)).then(r => dispatch(tokenSlice.actions.decimalsDai(r.payload)));

     dispatch(fetchActionsVault.totalAmounts(vault)).then(r => dispatch(tokenSlice.actions.ratioToken(r.payload)));

     dispatch(fetchActionsToken.balance({account,contract: eth})).then(r => dispatch(tokenSlice.actions.balanceEth(r.payload)));
     dispatch(fetchActionsToken.balance({account,contract: dai})).then(r => dispatch(tokenSlice.actions.balanceDai(r.payload)));
     dispatch(fetchActionsToken.allowance({vault, account, contract: eth})).then(r => dispatch(tokenSlice.actions.allowanceEth(r.payload)));
     dispatch(fetchActionsToken.allowance({vault, account, contract: dai})).then(r => dispatch(tokenSlice.actions.allowanceDai(r.payload)));

}
