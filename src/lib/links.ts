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

export function bubblemaps(chain: ChainKey, address: string): string | null {
  switch (chain) {
    case "eth":
      return `https://app.bubblemaps.io/eth/token/${address}`;
    case "bsc":
      return `https://app.bubblemaps.io/bsc/token/${address}`;
    case "base":
      return `https://app.bubblemaps.io/base/token/${address}`;
    case "arbitrum":
      return `https://app.bubblemaps.io/arbitrum/token/${address}`;
    case "solana":
      return `https://app.bubblemaps.io/sol/token/${address}`;
    case "robinhood":
    case "hyperliquid":
    case "plasma":
    case "monad":
    case "sui":
    case "ton":
      return null;
    default: {
      const _exhaustive: never = chain;
      return _exhaustive;
    }
  }
}

export function goplusScanner(chain: ChainKey, address: string): string | null {
  const id = CHAINS[chain].goplus;
  if (!id) return null;
  if (id === "solana") return `https://gopluslabs.io/token-security/solana/${address}`;
  return `https://gopluslabs.io/token-security/${id}/${address}`;
}

export function honeypotChecker(chain: ChainKey, address: string): string | null {
  switch (chain) {
    case "eth":
      return `https://honeypot.is/ethereum?address=${address}`;
    case "bsc":
      return `https://honeypot.is/?address=${address}`;
    case "base":
      return `https://honeypot.is/base?address=${address}`;
    case "arbitrum":
      return `https://honeypot.is/arbitrum?address=${address}`;
    case "robinhood":
    case "solana":
    case "hyperliquid":
    case "plasma":
    case "monad":
    case "sui":
    case "ton":
      return null;
    default: {
      const _exhaustive: never = chain;
      return _exhaustive;
    }
  }
}

export function rugcheckLink(chain: ChainKey, address: string): string | null {
  if (chain !== "solana") return null;
  return `https://rugcheck.xyz/tokens/${address}`;
}

export function tokenSniffer(chain: ChainKey, address: string): string | null {
  switch (chain) {
    case "eth":
      return `https://tokensniffer.com/token/eth/${address}`;
    case "bsc":
      return `https://tokensniffer.com/token/bsc/${address}`;
    case "base":
      return `https://tokensniffer.com/token/base/${address}`;
    case "arbitrum":
      return `https://tokensniffer.com/token/arb/${address}`;
    case "robinhood":
    case "solana":
    case "hyperliquid":
    case "plasma":
    case "monad":
    case "sui":
    case "ton":
      return null;
    default: {
      const _exhaustive: never = chain;
      return _exhaustive;
    }
  }
}

export function defiScanner(chain: ChainKey, address: string): string | null {
  switch (chain) {
    case "eth":
      return `https://de.fi/scanner/contract/${address}?chainId=1`;
    case "bsc":
      return `https://de.fi/scanner/contract/${address}?chainId=56`;
    case "base":
      return `https://de.fi/scanner/contract/${address}?chainId=8453`;
    case "arbitrum":
      return `https://de.fi/scanner/contract/${address}?chainId=42161`;
    case "robinhood":
    case "solana":
    case "hyperliquid":
    case "plasma":
    case "monad":
    case "sui":
    case "ton":
      return null;
    default: {
      const _exhaustive: never = chain;
      return _exhaustive;
    }
  }
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

export function rugToolLinks(pair: PairSnapshot) {
  const address = pair.base.address;
  return [
    ...externalLinks(pair),
    { label: "GoPlus", href: goplusScanner(pair.chain, address) },
    { label: "Honeypot.is", href: honeypotChecker(pair.chain, address) },
    { label: "RugCheck", href: rugcheckLink(pair.chain, address) },
    { label: "Bubblemaps", href: bubblemaps(pair.chain, address) },
    { label: "TokenSniffer", href: tokenSniffer(pair.chain, address) },
    { label: "De.fi", href: defiScanner(pair.chain, address) },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));
}
