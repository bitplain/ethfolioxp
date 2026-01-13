import { Prisma, TokenKind, TransferDirection } from "@prisma/client";
import { buildBackfillWhere } from "./backfill";
import { prisma } from "./db";
import { fetchUsdRubRate } from "./fx";
import { fetchJson } from "./httpClient";
import { log } from "./logger";
import { pickNearbyBucket } from "./prices";
import { getUserSettings } from "./settings";

const ETH_SYMBOL = "ETH";
const ETH_NAME = "Ethereum";
const ETH_CONTRACT = "native";
const PRICE_BUCKET_SECONDS = Number(process.env.PRICE_BUCKET_SECONDS || 3600);
const COINGECKO_API_BASE =
  process.env.COINGECKO_API_BASE || "https://api.coingecko.com/api/v3";
const ETHERSCAN_API_BASE =
  process.env.ETHERSCAN_API_BASE || "https://api.etherscan.io/v2/api";
const ETHERSCAN_CHAIN_ID = process.env.ETHERSCAN_CHAIN_ID || "1";
const ETHERSCAN_PAGE_SIZE = Math.max(
  1,
  Number(process.env.ETHERSCAN_PAGE_SIZE || 100)
);
const ETHERSCAN_MAX_PAGES = Math.max(
  1,
  Number(process.env.ETHERSCAN_MAX_PAGES || 20)
);
const MORALIS_API_BASE = "https://deep-index.moralis.io/api/v2.2";
const DEFAULT_MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const LIVE_FALLBACK_MAX_AGE_SEC = Number(
  process.env.LIVE_FALLBACK_MAX_AGE_SEC || 60 * 60
);
const PRICE_FALLBACK_MAX_AGE_SEC = Number(
  process.env.PRICE_FALLBACK_MAX_AGE_SEC || 72 * 3600
);
const BACKFILL_BATCH_SIZE = Number(process.env.BACKFILL_BATCH_SIZE || 150);
const BACKFILL_MAX_BATCHES = Number(process.env.BACKFILL_MAX_BATCHES || 5);
const BACKFILL_CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY || 4);
const BACKFILL_THROTTLE_MS = Number(process.env.BACKFILL_THROTTLE_MS || 200);

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEtherscan<T>(params: URLSearchParams, apiKey: string): Promise<T[]> {
  const url = new URL(ETHERSCAN_API_BASE);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("chainid", ETHERSCAN_CHAIN_ID);
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const response = await fetchJson<EtherscanResponse<unknown>>(url.toString());
  if (!response.ok) {
    log("error", "etherscan request failed", {
      status: response.status,
      error: response.error ?? null,
    });
    throw new Error(`Request failed: ${response.status}`);
  }
  const data = response.data;

  if (data.status === "0") {
    if (data.message.toLowerCase().includes("no transactions")) {
      return [];
    }
    const resultMessage = typeof data.result === "string" ? data.result : "";
    const combined = [data.message, resultMessage].filter(Boolean).join(": ");
    log("warn", "etherscan error", { message: combined || "Etherscan error" });
    throw new Error(combined || "Etherscan error");
  }

  return Array.isArray(data.result) ? (data.result as T[]) : [];
}

export async function fetchEtherscanPaginated<T>(
  params: URLSearchParams,
  apiKey: string,
  options?: {
    pageSize?: number;
    maxPages?: number;
    fetchPage?: (params: URLSearchParams, apiKey: string) => Promise<T[]>;
  }
): Promise<T[]> {
  const pageSize = options?.pageSize ?? ETHERSCAN_PAGE_SIZE;
  const maxPages = options?.maxPages ?? ETHERSCAN_MAX_PAGES;
  const fetchPage = options?.fetchPage ?? fetchEtherscan;
  const results: T[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const pageParams = new URLSearchParams(params);
    pageParams.set("page", String(page));
    pageParams.set("offset", String(pageSize));
    const chunk = await fetchPage(pageParams, apiKey);
    results.push(...chunk);
    if (chunk.length < pageSize) {
      break;
    }
  }

  return results;
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

  const result = await fetchJson<{ prices: [number, number][] }>(url);
  if (!result.ok || !result.data?.prices?.length) {
    return null;
  }
  return pickClosestPrice(result.data.prices, targetMs);
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

  const result = await fetchJson<{ usdPrice?: number | string }>(url, {
    init: { headers: { "X-API-Key": key } },
  });
  if (!result.ok) {
    return null;
  }
  const raw =
    typeof result.data.usdPrice === "number"
      ? result.data.usdPrice
      : Number(result.data.usdPrice);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }

  return null;
}

async function fetchDexscreenerPriceUsd(contractAddress: string) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`;

  const result = await fetchJson<{
    pairs?: { priceUsd?: string; liquidity?: { usd?: number } }[];
  }>(url);
  if (!result.ok) {
    return null;
  }
  const pairs = result.data?.pairs ?? [];
  if (!pairs.length) {
    return null;
  }

  const best = pairs
    .filter((pair) => pair.priceUsd)
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

  if (!best?.priceUsd) {
    return null;
  }

  const price = Number(best.priceUsd);
  if (Number.isFinite(price) && price > 0) {
    return price;
  }

  return null;
}

async function getPrices(
  token: { id: string; kind: TokenKind; contractAddress: string },
  timestampSec: number,
  options?: { moralisApiKey?: string | null; allowLiveFallback?: boolean }
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

  const allowLiveFallback = options?.allowLiveFallback ?? false;
  if (priceUsdRaw === null && token.kind === TokenKind.ERC20) {
    priceUsdRaw =
      (await fetchMoralisPriceUsd(
        token.contractAddress,
        timestampSec,
        options?.moralisApiKey
      )) ??
      (allowLiveFallback
        ? await fetchDexscreenerPriceUsd(token.contractAddress)
        : null);
  }

  let priceUsd =
    priceUsdRaw === null ? null : new Prisma.Decimal(priceUsdRaw);
  let priceRub = priceRubRaw === null ? null : new Prisma.Decimal(priceRubRaw);

  if (!priceUsd && !priceRub) {
    const nearby = await prisma.priceSnapshot.findMany({
      where: { tokenId: token.id },
      orderBy: { bucketTs: "desc" },
      take: 5,
    });
    const bucket = pickNearbyBucket(
      bucketTs,
      nearby.map((item) => item.bucketTs),
      PRICE_FALLBACK_MAX_AGE_SEC
    );
    const found = nearby.find((item) => item.bucketTs === bucket);
    if (found) {
      return { priceUsd: found.priceUsd, priceRub: found.priceRub, bucketTs };
    }
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

  try {
    await prisma.priceSnapshot.create({
      data: { tokenId: token.id, bucketTs, priceUsd, priceRub },
    });
  } catch {
    const existing = await prisma.priceSnapshot.findUnique({
      where: { tokenId_bucketTs: { tokenId: token.id, bucketTs } },
    });
    if (existing) {
      return { priceUsd: existing.priceUsd, priceRub: existing.priceRub, bucketTs };
    }
  }

  return { priceUsd, priceRub, bucketTs };
}

export async function syncWallet(userId: string) {
  const wallet = await prisma.wallet.findFirst({
    where: { userId },
  });

  if (!wallet) {
    throw new Error("Wallet is not set.");
  }

  const settings = await getUserSettings(userId);
  const apiKey = settings?.etherscanApiKey;
  const moralisApiKey = settings?.moralisApiKey ?? DEFAULT_MORALIS_API_KEY;
  if (!apiKey) {
    throw new Error("Etherscan API key is missing in settings.");
  }

  const address = normalizeAddress(wallet.address);
  const ethToken = await getOrCreateEthToken(userId);
  const nowSec = Math.floor(Date.now() / 1000);

  const [ethTxs, tokenTxs] = await Promise.all([
    fetchEtherscanPaginated<EtherscanTx>(
      new URLSearchParams({
        module: "account",
        action: "txlist",
        address,
        sort: "asc",
      }),
      apiKey
    ),
    fetchEtherscanPaginated<EtherscanTokenTx>(
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
    const ageSec = nowSec - timestampSec;
    const allowLiveFallback =
      ageSec >= 0 && ageSec <= LIVE_FALLBACK_MAX_AGE_SEC;
    const { priceUsd, priceRub } = await getPrices(ethToken, timestampSec, {
      moralisApiKey,
      allowLiveFallback,
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
    const ageSec = nowSec - timestampSec;
    const allowLiveFallback =
      ageSec >= 0 && ageSec <= LIVE_FALLBACK_MAX_AGE_SEC;

    const token = await getOrCreateToken(userId, {
      contractAddress: tx.contractAddress,
      symbol: tx.tokenSymbol,
      name: tx.tokenName,
      decimals,
    });

    const { priceUsd, priceRub } = await getPrices(token, timestampSec, {
      moralisApiKey,
      allowLiveFallback,
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
  const settings = await getUserSettings(userId);
  const moralisApiKey = settings?.moralisApiKey ?? DEFAULT_MORALIS_API_KEY;
  let cursorId: string | null = null;
  type TransferWithToken = Prisma.TransferGetPayload<{ include: { token: true } }>;

  const priceCache = new Map<
    string,
    { priceUsd: Prisma.Decimal | null; priceRub: Prisma.Decimal | null }
  >();
  const concurrency = Math.max(1, BACKFILL_CONCURRENCY);

  while (batches < BACKFILL_MAX_BATCHES) {
    const transfers: TransferWithToken[] = await prisma.transfer.findMany({
      where: buildBackfillWhere(userId, cursorId),
      include: { token: true },
      orderBy: { id: "asc" },
      take: BACKFILL_BATCH_SIZE,
    });

    if (!transfers.length) {
      break;
    }

    cursorId = transfers[transfers.length - 1].id;
    scanned += transfers.length;
    let batchUpdated = 0;

    for (let index = 0; index < transfers.length; index += concurrency) {
      const slice = transfers.slice(index, index + concurrency);
      const results = await Promise.all(
        slice.map(async (transfer) => {
          const timestampSec = Math.floor(transfer.blockTime.getTime() / 1000);
          const bucketTs =
            Math.floor(timestampSec / PRICE_BUCKET_SECONDS) * PRICE_BUCKET_SECONDS;
          const cacheKey = `${transfer.tokenId}:${bucketTs}`;
          const cached = priceCache.get(cacheKey);
          const { priceUsd, priceRub } =
            cached ??
            (await getPrices(transfer.token, timestampSec, {
              moralisApiKey,
              allowLiveFallback: false,
            }));

          if (!cached) {
            priceCache.set(cacheKey, { priceUsd, priceRub });
          }

          if (!priceUsd && !priceRub) {
            return false;
          }

          const valueUsd = priceUsd ? priceUsd.mul(transfer.amount) : null;
          const valueRub = priceRub ? priceRub.mul(transfer.amount) : null;

          await prisma.transfer.update({
            where: { id: transfer.id },
            data: { priceUsd, valueUsd, priceRub, valueRub },
          });

          return true;
        })
      );

      const updatedNow = results.filter(Boolean).length;
      updated += updatedNow;
      batchUpdated += updatedNow;

      if (BACKFILL_THROTTLE_MS > 0 && index + concurrency < transfers.length) {
        await sleep(BACKFILL_THROTTLE_MS);
      }
    }

    batches += 1;
  }

  return { scanned, updated };
}
