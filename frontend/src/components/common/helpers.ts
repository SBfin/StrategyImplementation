import { formatUnits } from "@ethersproject/units";
import { ethers } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";

const MINIMUN_TOKEN = 0;

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
  return Math.pow(1.0001, tick) * Math.pow(10, -1 * Math.abs(decimal0 - decimal1));
}

export function validateNumber(token1, token2, symbol1, symbol2, max1, max2, min1 = MINIMUN_TOKEN, min2 = MINIMUN_TOKEN) {
  // get the number to validate, a max value (<=) and a min (>=) (if not passed, the min should be 1)
  const res = { message: "DEPOSIT", disable: true };
  if (isNaN(Number(token1)) || isNaN(Number(token2)) || !(Number(token1) >= min1 && Number(token2) >= min2)) res.message = "Insert a valid number";
  else if (!(Number(token1) <= max1)) res.message = "Insufficient balance of " + symbol1;
  else if (!(Number(token2) <= max2)) res.message = "Insufficient balance of " + symbol2;
  else res.disable = false;

  return res;
}

export function calculateTVL(token0: number, token1: number, decimal0: number, decimal1: number, tick: number): string {
  const sqrtTick = Math.sqrt(Math.pow(1.0001, tick)) * Math.pow(2, 96);
  const price = (sqrtTick * sqrtTick * 1e18) / Math.pow(2, 96 * 2);
  const tvl = parseFloat(token1) + (parseFloat(token0) * price) / 1e18;
  return fromUnitsToDecimal(parseInt(tvl, 10) + "", Math.min(decimal0, decimal1));
}

export function getSymbolToken(useEth: boolean, token: string) {
  if (token == "ETH" && !useEth) return "WETH";
  if (token == "WETH" && useEth) return "ETH";
  return token;
}
