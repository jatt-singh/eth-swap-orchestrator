import { DirectedGraph } from "graphology";
import { chainlinkFeeds } from "./constant";
import { getLiveRate } from "./utils";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

const TOKENS = Object.keys(chainlinkFeeds);
const LOG_PATH = path.join(__dirname, "../logs/swap_routes.json");

async function buildGraph(provider: ethers.JsonRpcProvider): Promise<DirectedGraph> {
    const tokenPairs: [string, string, number][] = [
        ["ETH", "USDC", 0.003], ["USDC", "DAI", 0.001], ["ETH", "DAI", 0.004],
        ["ETH", "LINK", 0.003], ["LINK", "DAI", 0.002], ["ETH", "WBTC", 0.002],
        ["WBTC", "DAI", 0.003], ["UNI", "DAI", 0.002], ["ETH", "UNI", 0.003]
    ];

    const graph = new DirectedGraph();

    for (const token of TOKENS) graph.addNode(token);

    for (const [from, to, fee] of tokenPairs) {
        const rate = await getLiveRate(from, to, provider);
        if (rate && rate > 0) {
            graph.addEdge(from, to, { weight: -Math.log(rate * (1 - fee))});
        }
    }

    return graph;
}

function findBestSwapPath(graph: DirectedGraph, fromToken: string, toToken: string, amount: number): {path: string[], amount: number} {
    const tokens: string[] = graph.nodes();
    const distances: Record<string, number> = {};
    const predecessors: Record<string, string | null> = {};

    tokens.forEach((token: string) => {
        distances[token] = Infinity;
        predecessors[token] = null;
    });

    distances[fromToken] = 0;

    for(let i = 0; i < tokens.length - 1; i++) {
        for(const edge of graph.edges()) {
            const from = graph.source(edge) as string;
            const to = graph.target(edge) as string;
            const weight = graph.getEdgeAttribute(edge, 'weight') as number;

            if(distances[from] + weight < distances[to]) {
                distances[to] = distances[from] + weight;
                predecessors[to] = from;
            }
        }
    }

    const path: string[] = [];
    let current: string | null = toToken;

    while(current) {
        path.unshift(current);
        current = predecessors[current];
    }

    if(path[0] !== fromToken) {
        return { path: [], amount: 0 };
    }

    const outputAmount = amount * Math.exp(-distances[toToken]);

    return { path, amount: outputAmount}
}

export type LogItemType = {
    timestamp: string;
    from: string;
    to: string;
    path: string[];
    output: number;
};

export async function logAllPaths(provider: ethers.JsonRpcProvider) {
    const g = await buildGraph(provider);
    const entries: LogItemType[] = [];
    const timestamp = new Date().toISOString();

    for (const from of TOKENS) {
        for (const to of TOKENS) {
            if (from === to) continue;
            const { path, amount } = findBestSwapPath(g, from, to, 1);
            if(path.length > 1) {
                entries.push({ timestamp, from, to, path, output: Number(amount.toFixed(6)) });                
            }
        }
    }

    let previous: any[] = [];

    if (fs.existsSync(LOG_PATH)) {
        try {
            previous = JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
        } catch (e: any) {
            console.error("[ERROR] Failed to parse existing swap_routes.json:", e.message);
        }
    }

    previous.push(...entries);
    fs.writeFileSync(LOG_PATH, JSON.stringify(previous, null, 2));
    console.log(`[INFO] Logged ${entries.length} swap paths at ${timestamp}`);
}