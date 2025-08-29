import { chainlinkFeeds } from "./constant";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

export const LOG_DIR = path.join(__dirname, "../logs");
export const OUTPUT_LOG = path.join(LOG_DIR, "output.log");
export const ROUTES_LOG = path.join(LOG_DIR, "swap_routes.json");

export function ensureLogsDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400),
        h = Math.floor((seconds % 86400) / 3600),
        m = Math.floor((seconds % 3600) / 60),
        s = seconds % 60;
  return `${d>0?d+'d ':''}${h>0?h+'h ':''}${m>0?m+'m ':''}${s>0?s+'s ':''}`.trim();
}

async function getLivePrice(symbol: string, provider: ethers.JsonRpcProvider): Promise<number|null> {
  try {
    const feed = chainlinkFeeds[symbol];
    const abi = ["function latestAnswer() view returns (int256)"];
    const contract = new ethers.Contract(feed.address, abi, provider);
    const raw = await contract.latestAnswer();
    return Number(raw) / 10**feed.decimals;
  } catch { return null; }
}

export async function getLiveRate(from:string,to:string,provider:ethers.JsonRpcProvider): Promise<number|null> {
  const p1 = await getLivePrice(from, provider);
  const p2 = await getLivePrice(to, provider);
  if(!p1||!p2) return null;
  return p2/p1;
}
