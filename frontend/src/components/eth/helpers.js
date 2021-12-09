import {formatUnits} from "@ethersproject/units";
import { ethers } from 'ethers';


const MINIMUN_TOKEN = 0.00001;


export function decimalFormat(number, decimals) {
    if(!number || !decimals){
        return 0;
    }
    return parseFloat(formatUnits(String(number), parseInt(decimals)))
}

export function dinamicFixed(num, dec) {
    return Math.round(num * (Math.pow(10,dec))) / Math.pow(10,dec);
}

export function tickToPrice(tick, decimal0, decimal1) {
    tick = Math.abs(tick)
    return dinamicFixed(Math.pow(1.0001, tick) * (Math.pow(10, decimal0 - decimal1)),5)
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
    num_1 = dinamicFixed(num_1, 4)
    num_2 = dinamicFixed(num_2, 4)
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

export function calcTokenByShares(shares, totalShares, token1Tot, token2Tot) {
    const rapp = dinamicFixed((shares / totalShares),3)
    return [String(token1Tot * rapp), String(token2Tot * rapp)]
}

