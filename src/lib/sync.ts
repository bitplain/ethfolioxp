import { Prisma, TokenKind, TransferDirection } from "@prisma/client";
import { prisma } from "./db";

const ETH_SYMBOL = "ETH";
const ETH_NAME = "Ethereum";
const ETH_CONTRACT = "native";
const PRICE_BUCKET_SECONDS = Number(process.env.PRICE_BUCKET_SECONDS || 3600);
const COINGECKO_API_BASE =
  process.env.COINGECKO_API_BASE || "https://api.coingecko.com/api/v3";
const ETHERSCAN_API_BASE =
  process.env.ETHERSCAN_API_BASE || "https://api.etherscan.io/v2/api";
const ETHERSCAN_CHAIN_ID = process.env.ETHERSCAN_CHAIN_ID || "1";

type EtherscanResponse<T> = {
  status: string;
  message: string;
  result: T;
};

type EtherscanTx = {
  hash: string;
  timeStamp: string;
  value: string;
  from: string;
  to: string;
  isError: string;
  txreceipt_status: string;
};

type EtherscanTokenTx = {
  hash: string;
  timeStamp: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
  from: string;
  to: string;
  logIndex: string;
};

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function toDecimalAmount(raw: string, decimals: number) {
  const value = new Prisma.Decimal(raw);
  const divider = new Prisma.Decimal(10).pow(decimals);
  return value.div(divider);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchEtherscan<T>(params: URLSearchParams, apiKey: string): Promise<T[]> {
  const url = new URL(ETHERSCAN_API_BASE);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("chainid", ETHERSCAN_CHAIN_ID);
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const data = await fetchJson<EtherscanResponse<unknown>>(url.toString());

  if (data.status === "0") {
    if (data.message.toLowerCase().includes("no transactions")) {
      return [];
    }
    const resultMessage = typeof data.result === "string" ? data.result : "";
    const combined = [data.message, resultMessage].filter(Boolean).join(": ");
    throw new Error(combined || "Etherscan error");
  }

  return Array.isArray(data.result) ? (data.result as T[]) : [];
}

async function getOrCreateEthToken(userId: string) {
  return prisma.token.upsert({
    where: {
      userId_kind_contractAddress: {
        userId,
        kind: TokenKind.ETH,
        contractAddress: ETH_CONTRACT,
      },
    },
    update: {},
    create: {
      userId,
      kind: TokenKind.ETH,
      contractAddress: ETH_CONTRACT,
      symbol: ETH_SYMBOL,
      name: ETH_NAME,
      decimals: 18,
    },
  });
}

async function getOrCreateToken(userId: string, payload: {
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
}) {
  const contractAddress = normalizeAddress(payload.contractAddress);
  return prisma.token.upsert({
    where: {
      userId_kind_contractAddress: {
        userId,
        kind: TokenKind.ERC20,
        contractAddress,
      },
    },
    update: {},
    create: {
      userId,
      kind: TokenKind.ERC20,
      contractAddress,
      symbol: payload.symbol || "UNKNOWN",
      name: payload.name || payload.symbol || "Unknown Token",
      decimals: payload.decimals,
    },
  });
}

function pickClosestPrice(prices: [number, number][], targetMs: number) {
  let closest: [number, number] | null = null;
  let minDiff = Number.POSITIVE_INFINITY;
  for (const item of prices) {
    const diff = Math.abs(item[0] - targetMs);
    if (diff < minDiff) {
      minDiff = diff;
      closest = item;
    }
  }
  return closest?.[1] ?? null;
}

async function fetchTokenPriceUsd(token: { kind: TokenKind; contractAddress: string }, bucketTs: number) {
  const from = bucketTs - 3600;
  const to = bucketTs + 3600;
  const targetMs = bucketTs * 1000;

  const endpoint = token.kind === TokenKind.ETH
    ? "/coins/ethereum/market_chart/range"
    : `/coins/ethereum/contract/${token.contractAddress}/market_chart/range`;

  const url = `${COINGECKO_API_BASE}${endpoint}?vs_currency=usd&from=${from}&to=${to}`;

  try {
    const data = await fetchJson<{ prices: [number, number][] }>(url);
    if (!data?.prices?.length) {
      return null;
    }
    return pickClosestPrice(data.prices, targetMs);
  } catch {
    return null;
  }
}

async function getPriceUsd(token: { id: string; kind: TokenKind; contractAddress: string }, timestampSec: number) {
  const bucketTs = Math.floor(timestampSec / PRICE_BUCKET_SECONDS) * PRICE_BUCKET_SECONDS;
  const cached = await prisma.priceSnapshot.findUnique({
    where: { tokenId_bucketTs: { tokenId: token.id, bucketTs } },
  });

  if (cached) {
    return { priceUsd: cached.priceUsd, bucketTs };
  }

  const price = await fetchTokenPriceUsd(token, bucketTs);
  if (price === null) {
    return { priceUsd: null, bucketTs };
  }

  const priceDecimal = new Prisma.Decimal(price);
  await prisma.priceSnapshot.create({
    data: { tokenId: token.id, bucketTs, priceUsd: priceDecimal },
  });

  return { priceUsd: priceDecimal, bucketTs };
}

export async function syncWallet(userId: string) {
  const wallet = await prisma.wallet.findFirst({
    where: { userId },
  });

  if (!wallet) {
    throw new Error("Wallet is not set.");
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });
  const apiKey = settings?.etherscanApiKey;
  if (!apiKey) {
    throw new Error("Etherscan API key is missing in settings.");
  }

  const address = normalizeAddress(wallet.address);
  const ethToken = await getOrCreateEthToken(userId);

  const [ethTxs, tokenTxs] = await Promise.all([
    fetchEtherscan<EtherscanTx>(
      new URLSearchParams({
        module: "account",
        action: "txlist",
        address,
        sort: "asc",
      }),
      apiKey
    ),
    fetchEtherscan<EtherscanTokenTx>(
      new URLSearchParams({
        module: "account",
        action: "tokentx",
        address,
        sort: "asc",
      }),
      apiKey
    ),
  ]);

  let created = 0;

  for (const tx of ethTxs) {
    if (tx.isError !== "0") {
      continue;
    }

    const from = normalizeAddress(tx.from);
    const to = normalizeAddress(tx.to);

    if (from !== address && to !== address) {
      continue;
    }

    if (tx.value === "0") {
      continue;
    }

    const direction = from === address ? TransferDirection.OUT : TransferDirection.IN;
    const amount = toDecimalAmount(tx.value, 18);
    const timestampSec = Number(tx.timeStamp);
    const { priceUsd } = await getPriceUsd(ethToken, timestampSec);
    const valueUsd = priceUsd ? priceUsd.mul(amount) : null;

    try {
      await prisma.transfer.create({
        data: {
          userId,
          walletId: wallet.id,
          tokenId: ethToken.id,
          txHash: tx.hash,
          blockTime: new Date(timestampSec * 1000),
          direction,
          amount,
          priceUsd,
          valueUsd,
          logIndex: 0,
          source: "etherscan",
        },
      });
      created += 1;
    } catch {
      // ignore duplicates
    }
  }

  for (const tx of tokenTxs) {
    const from = normalizeAddress(tx.from);
    const to = normalizeAddress(tx.to);

    if (from !== address && to !== address) {
      continue;
    }

    const direction = from === address ? TransferDirection.OUT : TransferDirection.IN;
    const decimals = Number(tx.tokenDecimal || 0);
    const amount = toDecimalAmount(tx.value, decimals);
    const timestampSec = Number(tx.timeStamp);

    const token = await getOrCreateToken(userId, {
      contractAddress: tx.contractAddress,
      symbol: tx.tokenSymbol,
      name: tx.tokenName,
      decimals,
    });

    const { priceUsd } = await getPriceUsd(token, timestampSec);
    const valueUsd = priceUsd ? priceUsd.mul(amount) : null;

    try {
      await prisma.transfer.create({
        data: {
          userId,
          walletId: wallet.id,
          tokenId: token.id,
          txHash: tx.hash,
          blockTime: new Date(timestampSec * 1000),
          direction,
          amount,
          priceUsd,
          valueUsd,
          logIndex: Number(tx.logIndex || 0),
          source: "etherscan",
        },
      });
      created += 1;
    } catch {
      // ignore duplicates
    }
  }

  return { created, ethCount: ethTxs.length, tokenCount: tokenTxs.length };
}
