import {formatUnits} from "@ethersproject/units";
import { useSelector, useDispatch } from 'react-redux';
import {fetchActionsToken, tokenSlice, Token} from '../eth/TokenBalance';
import {vaultSlice,fetchActionsVault, GetVault} from '../eth/vault';
import {ContractAddress} from '../../helpers/connector';
import { useWeb3React } from '@web3-react/core'

const MINIMUN_TOKEN = 0.00001;

export function decimalFormat(number, decimals) {
    if(!number || !decimals){
        return 0;
    }
    return parseFloat(formatUnits(number, parseInt(decimals)))
}

export function dinamicFixed(num, dec) {
    return Math.round(num * (Math.pow(10,dec))) / Math.pow(10,dec);
}

function gcd(a , b)
    {
        if (a < b)
            return gcd(b, a);
 
        // base case
        if (Math.abs(b) < MINIMUN_TOKEN)
            return a;
        else
            return (gcd(b, a - Math.floor(a / b) * b));
    }

export function calculateRatio(num_1, num_2) {
    const den = (gcd(num_1, num_2));
    if(isNaN(num_1) || isNaN(num_2) || isNaN(den) || den === 0) return '0:0'
    var ratio = num_1/den+":"+num_2/den;
    return ratio;
}

export function validateNumber(token1, token2, max1, max2, min1 = MINIMUN_TOKEN, min2 = MINIMUN_TOKEN) { //get the number to validate, a max value (<=) and a min (>=) (if not passed, the min should be 1)
    if(isNaN(Number(token1)) || isNaN(Number(token2)) || (!(Number(token1) >= min1 && Number(token2) >= min2)))
    return 'Insert a valid number'
    
    if(!(Number(token1) <= max1 && Number(token2) <= max2))
    return 'Insufficient balance'

    return false
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
