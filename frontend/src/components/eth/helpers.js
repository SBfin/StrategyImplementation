import {formatUnits} from "@ethersproject/units";

export function decimalFormat(number, decimals) {
    if(!number || !decimals){
        return 0;
    }
    return Math.round(parseFloat(formatUnits(number, parseInt(decimals))) * 100) / 100;
}
