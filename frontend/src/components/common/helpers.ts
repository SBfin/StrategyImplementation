import { formatUnits } from "@ethersproject/units";
import { ethers } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";

const MINIMUN_TOKEN = 0.00001;

export function fromUnitsToDecimal(num, decimals): string {
  if (!num || !decimals) {
    return "0";
  }
  return formatUnits(num, decimals);
}

export function truncateNumber(num, decimals): number {
  return parseFloat(parseFloat(num).toFixed(decimals));
}

export function tickToPrice(tick, decimal0, decimal1) {
  tick = Math.abs(tick);
  return truncateNumber(Math.pow(1.0001, tick) * Math.pow(10, -1 * Math.abs(decimal0 - decimal1)), 5);
}

export function validateNumber(token1, token2, max1, max2, min1 = MINIMUN_TOKEN, min2 = MINIMUN_TOKEN) {
  // get the number to validate, a max value (<=) and a min (>=) (if not passed, the min should be 1)
  if (isNaN(Number(token1)) || isNaN(Number(token2)) || !(Number(token1) >= min1 && Number(token2) >= min2)) return "Insert a valid number";

  if (!(Number(token1) <= max1 && Number(token2) <= max2)) return "Insufficient balance";

  return false;
}

export function calculateTVL(token0: number, token1: number, decimal0: number, decimal1: number, price: number): number {
  const first = fromUnitsToDecimal(token0, decimal0);
  const second = fromUnitsToDecimal(token1, decimal1);

  return Math.min(first, second) * price + Math.max(first, second);
}
