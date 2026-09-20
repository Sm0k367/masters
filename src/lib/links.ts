import { CHAINS } from "@/lib/chains";
import type { ChainKey, PairSnapshot } from "@/lib/types";

export function dexScreenerPair(chain: ChainKey, pairAddress: string): string {
  return `https://dexscreener.com/${CHAINS[chain].dex}/${pairAddress}`;
}

export function geckoPool(chain: ChainKey, pairAddress: string): string {
  return `https://www.geckoterminal.com/${CHAINS[chain].gecko}/pools/${pairAddress}`;
}

export function explorerToken(chain: ChainKey, address: string): string {
  return CHAINS[chain].explorerToken(address);
}

export function gmgnToken(chain: ChainKey, address: string): string {
  switch (chain) {
    case "robinhood":
      return `https://gmgn.ai/robinhood/token/${address}`;
    case "solana":
      return `https://gmgn.ai/sol/token/${address}`;
    case "base":
      return `https://gmgn.ai/base/token/${address}`;
    case "eth":
      return `https://gmgn.ai/eth/token/${address}`;
    case "bsc":
      return `https://gmgn.ai/bsc/token/${address}`;
    case "arbitrum":
      return `https://gmgn.ai/arb/token/${address}`;
    case "hyperliquid":
    case "plasma":
    case "monad":
    case "sui":
    case "ton":
      return CHAINS[chain].gmgn;
    default: {
      const _exhaustive: never = chain;
      return _exhaustive;
    }
  }
}

export function birdeyeToken(chain: ChainKey, address: string): string {
  switch (chain) {
    case "robinhood":
      return `https://birdeye.so/token/${address}?chain=robinhood`;
    case "solana":
      return `https://birdeye.so/token/${address}?chain=solana`;
    case "base":
      return `https://birdeye.so/token/${address}?chain=base`;
    case "eth":
      return `https://birdeye.so/token/${address}?chain=ethereum`;
    case "bsc":
      return `https://birdeye.so/token/${address}?chain=bsc`;
    case "arbitrum":
      return `https://birdeye.so/token/${address}?chain=arbitrum`;
    case "hyperliquid":
    case "plasma":
    case "monad":
    case "sui":
    case "ton":
      return CHAINS[chain].birdeye;
    default: {
      const _exhaustive: never = chain;
      return _exhaustive;
    }
  }
}

export function xSearch(pair: PairSnapshot): string {
  return `https://x.com/search?q=${encodeURIComponent(`${pair.base.symbol} ${pair.base.address}`)}&src=typed_query`;
}

export function ponsLaunchpad(): string {
  return "https://ponsfamily.com/launchpad";
}

export function robinSwap(): string {
  return "https://robinswap.trade/stats";
}

export function uniswapSwap(chain: ChainKey, address: string): string {
  const config = CHAINS[chain];
  if (!config.uniswap) return dexScreenerPair(chain, address);
  return `https://app.uniswap.org/swap?chain=${config.dex}&outputCurrency=${address}`;
}

export function externalLinks(pair: PairSnapshot) {
  return [
    {
      label: "DexScreener",
      href: pair.url.includes("geckoterminal")
        ? dexScreenerPair(pair.chain, pair.pairAddress)
        : pair.url,
    },
    { label: "GeckoTerminal", href: geckoPool(pair.chain, pair.pairAddress) },
    { label: "GMGN", href: gmgnToken(pair.chain, pair.base.address) },
    { label: "Birdeye", href: birdeyeToken(pair.chain, pair.base.address) },
    { label: "Explorer", href: explorerToken(pair.chain, pair.base.address) },
    { label: "X", href: xSearch(pair) },
  ];
}
