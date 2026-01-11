import { Prisma, TokenKind, TransferDirection } from "@prisma/client";
import { prisma } from "./db";
import { fetchUsdRubRate } from "./fx";

const ETH_SYMBOL = "ETH";
const ETH_NAME = "Ethereum";
const ETH_CONTRACT = "native";
const PRICE_BUCKET_SECONDS = Number(process.env.PRICE_BUCKET_SECONDS || 3600);
const COINGECKO_API_BASE =
  process.env.COINGECKO_API_BASE || "https://api.coingecko.com/api/v3";
const ETHERSCAN_API_BASE =
  process.env.ETHERSCAN_API_BASE || "https://api.etherscan.io/v2/api";
const ETHERSCAN_CHAIN_ID = process.env.ETHERSCAN_CHAIN_ID || "1";
const MORALIS_API_BASE = "https://deep-index.moralis.io/api/v2.2";
const DEFAULT_MORALIS_API_KEY = process.env.MORALIS_API_KEY;

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

async function fetchTokenPrice(
  token: { kind: TokenKind; contractAddress: string },
  bucketTs: number,
  currency: "usd" | "rub"
) {
  const from = bucketTs - 3600;
  const to = bucketTs + 3600;
  const targetMs = bucketTs * 1000;

  const endpoint = token.kind === TokenKind.ETH
    ? "/coins/ethereum/market_chart/range"
    : `/coins/ethereum/contract/${token.contractAddress}/market_chart/range`;

  const url = `${COINGECKO_API_BASE}${endpoint}?vs_currency=${currency}&from=${from}&to=${to}`;

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

async function fetchMoralisPriceUsd(
  contractAddress: string,
  timestampSec: number,
  apiKey?: string | null
) {
  const key = apiKey || DEFAULT_MORALIS_API_KEY;
  if (!key) {
    return null;
  }

  const toDate = new Date(timestampSec * 1000).toISOString();
  const url =
    `${MORALIS_API_BASE}/erc20/${contractAddress}/price?chain=eth&to_date=` +
    encodeURIComponent(toDate);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "X-API-Key": key },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { usdPrice?: number | string };
    const raw =
      typeof data.usdPrice === "number" ? data.usdPrice : Number(data.usdPrice);
    if (Number.isFinite(raw) && raw > 0) {
      return raw;
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchDexscreenerPriceUsd(contractAddress: string) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`;

  try {
    const data = await fetchJson<{
      pairs?: { priceUsd?: string; liquidity?: { usd?: number } }[];
    }>(url);
    const pairs = data?.pairs ?? [];
    if (!pairs.length) {
      return null;
    }

    const best = pairs
      .filter((pair) => pair.priceUsd)
      .sort(
        (a, b) =>
          (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
      )[0];

    if (!best?.priceUsd) {
      return null;
    }

    const price = Number(best.priceUsd);
    if (Number.isFinite(price) && price > 0) {
      return price;
    }
  } catch {
    return null;
  }

  return null;
}

async function getPrices(
  token: { id: string; kind: TokenKind; contractAddress: string },
  timestampSec: number,
  options?: { moralisApiKey?: string | null }
) {
  const bucketTs = Math.floor(timestampSec / PRICE_BUCKET_SECONDS) * PRICE_BUCKET_SECONDS;
  const cached = await prisma.priceSnapshot.findUnique({
    where: { tokenId_bucketTs: { tokenId: token.id, bucketTs } },
  });

  if (cached) {
    if (cached.priceRub === null) {
      const priceRubRaw = await fetchTokenPrice(token, bucketTs, "rub");
      let priceRub =
        priceRubRaw === null ? null : new Prisma.Decimal(priceRubRaw);

      if (!priceRub) {
        const fxRate = await fetchUsdRubRate(bucketTs);
        if (fxRate) {
          priceRub = cached.priceUsd.mul(fxRate);
        }
      }

      if (priceRub) {
        await prisma.priceSnapshot.update({
          where: { tokenId_bucketTs: { tokenId: token.id, bucketTs } },
          data: { priceRub },
        });
        return { priceUsd: cached.priceUsd, priceRub, bucketTs };
      }
    }

    return { priceUsd: cached.priceUsd, priceRub: cached.priceRub, bucketTs };
  }

  let [priceUsdRaw, priceRubRaw] = await Promise.all([
    fetchTokenPrice(token, bucketTs, "usd"),
    fetchTokenPrice(token, bucketTs, "rub"),
  ]);

  if (priceUsdRaw === null && token.kind === TokenKind.ERC20) {
    priceUsdRaw =
      (await fetchMoralisPriceUsd(
        token.contractAddress,
        timestampSec,
        options?.moralisApiKey
      )) ??
      (await fetchDexscreenerPriceUsd(token.contractAddress));
  }

  let priceUsd =
    priceUsdRaw === null ? null : new Prisma.Decimal(priceUsdRaw);
  let priceRub = priceRubRaw === null ? null : new Prisma.Decimal(priceRubRaw);

  if (!priceUsd && !priceRub) {
    return { priceUsd: null, priceRub: null, bucketTs };
  }

  if (!priceRub && priceUsd) {
    const fxRate = await fetchUsdRubRate(bucketTs);
    if (fxRate) {
      priceRub = priceUsd.mul(fxRate);
    }
  }

  if (!priceUsd && priceRub) {
    const fxRate = await fetchUsdRubRate(bucketTs);
    if (fxRate) {
      priceUsd = priceRub.div(fxRate);
    }
  }

  if (!priceUsd) {
    return { priceUsd: null, priceRub: null, bucketTs };
  }

  await prisma.priceSnapshot.create({
    data: { tokenId: token.id, bucketTs, priceUsd, priceRub },
  });

  return { priceUsd, priceRub, bucketTs };
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
  const moralisApiKey = settings?.moralisApiKey ?? DEFAULT_MORALIS_API_KEY;
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
    const { priceUsd, priceRub } = await getPrices(ethToken, timestampSec, {
      moralisApiKey,
    });
    const valueUsd = priceUsd ? priceUsd.mul(amount) : null;
    const valueRub = priceRub ? priceRub.mul(amount) : null;

    const ethKey = { txHash: tx.hash, tokenId: ethToken.id, logIndex: 0 };

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
          priceRub,
          valueRub,
          logIndex: ethKey.logIndex,
          source: "etherscan",
        },
      });
      created += 1;
    } catch {
      await prisma.transfer
        .updateMany({
          where: { ...ethKey, priceManual: false },
          data: { priceUsd, valueUsd, priceRub, valueRub },
        })
        .catch(() => {});
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

    const { priceUsd, priceRub } = await getPrices(token, timestampSec, {
      moralisApiKey,
    });
    const valueUsd = priceUsd ? priceUsd.mul(amount) : null;
    const valueRub = priceRub ? priceRub.mul(amount) : null;

    const logIndex = Number(tx.logIndex || 0);
    const tokenKey = { txHash: tx.hash, tokenId: token.id, logIndex };

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
          priceRub,
          valueRub,
          logIndex,
          source: "etherscan",
        },
      });
      created += 1;
    } catch {
      await prisma.transfer
        .updateMany({
          where: { ...tokenKey, priceManual: false },
          data: { priceUsd, valueUsd, priceRub, valueRub },
        })
        .catch(() => {});
    }
  }

  return { created, ethCount: ethTxs.length, tokenCount: tokenTxs.length };
}

export async function backfillMissingPrices(userId: string) {
  let scanned = 0;
  let updated = 0;
  let batches = 0;
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });
  const moralisApiKey = settings?.moralisApiKey ?? DEFAULT_MORALIS_API_KEY;

  while (batches < 5) {
    const transfers = await prisma.transfer.findMany({
      where: {
        userId,
        priceManual: false,
        OR: [{ priceUsd: null }, { priceRub: null }],
      },
      include: { token: true },
      orderBy: { blockTime: "asc" },
      take: 150,
    });

    if (!transfers.length) {
      break;
    }

    scanned += transfers.length;
    let batchUpdated = 0;

    for (const transfer of transfers) {
      const timestampSec = Math.floor(transfer.blockTime.getTime() / 1000);
      const { priceUsd, priceRub } = await getPrices(transfer.token, timestampSec, {
        moralisApiKey,
      });
      if (!priceUsd && !priceRub) {
        continue;
      }

      const valueUsd = priceUsd ? priceUsd.mul(transfer.amount) : null;
      const valueRub = priceRub ? priceRub.mul(transfer.amount) : null;

      await prisma.transfer.update({
        where: { id: transfer.id },
        data: { priceUsd, valueUsd, priceRub, valueRub },
      });
      updated += 1;
      batchUpdated += 1;
    }

    if (batchUpdated === 0) {
      break;
    }

    batches += 1;
  }

  return { scanned, updated };
}
