import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

export const CONTRACT_ADDRESS = "0x1b238921b258d253C3f0e3D0a629E31a62EBdFA4" as const;
export const EXPLORER_ADDRESS = `https://explorer-bradbury.genlayer.com/address/${CONTRACT_ADDRESS}`;

export const readClient = createClient({ chain: testnetBradbury });

export type MarketRecord = {
  id: bigint;
  creator: string;
  question: string;
  source_url: string;
  resolution_policy: string;
  created_at: string;
  close_ts: bigint;
  resolution_deadline_ts: bigint;
  status: "open" | "closed" | "resolved" | "cancelled";
  outcome: "yes" | "no" | "none";
  confidence_bps: bigint;
  resolved_at: string;
  yes_pool: bigint;
  no_pool: bigint;
  total_staked: bigint;
  paid_out: bigint;
  refunded: bigint;
  remaining_liability: bigint;
  can_cancel: boolean;
};

export type PositionRecord = {
  found: boolean;
  market_id: bigint;
  owner: string;
  outcome: "yes" | "no";
  stake: bigint;
  claimed: boolean;
};

type LooseRecord = Record<string, unknown>;
type TransactionHash = `0x${string}` & { length: 66 };

function asRecord(value: unknown): LooseRecord {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as LooseRecord;
    } catch {
      throw new Error("The contract returned malformed market data.");
    }
  }
  if (value && typeof value === "object") return value as LooseRecord;
  throw new Error("The contract returned unexpected market data.");
}

function asBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return 0n;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function marketFrom(value: unknown): MarketRecord {
  const market = asRecord(value);
  return {
    id: asBigInt(market.id),
    creator: asString(market.creator),
    question: asString(market.question),
    source_url: asString(market.source_url),
    resolution_policy: asString(market.resolution_policy),
    created_at: asString(market.created_at),
    close_ts: asBigInt(market.close_ts),
    resolution_deadline_ts: asBigInt(market.resolution_deadline_ts),
    status: asString(market.status) as MarketRecord["status"],
    outcome: asString(market.outcome) as MarketRecord["outcome"],
    confidence_bps: asBigInt(market.confidence_bps),
    resolved_at: asString(market.resolved_at),
    yes_pool: asBigInt(market.yes_pool),
    no_pool: asBigInt(market.no_pool),
    total_staked: asBigInt(market.total_staked),
    paid_out: asBigInt(market.paid_out),
    refunded: asBigInt(market.refunded),
    remaining_liability: asBigInt(market.remaining_liability),
    can_cancel: asBoolean(market.can_cancel),
  };
}

function positionFrom(value: unknown): PositionRecord {
  const position = asRecord(value);
  return {
    found: asBoolean(position.found),
    market_id: asBigInt(position.market_id),
    owner: asString(position.owner),
    outcome: asString(position.outcome) as PositionRecord["outcome"],
    stake: asBigInt(position.stake),
    claimed: asBoolean(position.claimed),
  };
}

export async function readMarkets(): Promise<MarketRecord[]> {
  const count = asBigInt(
    await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: "get_market_count" }),
  );
  const requests = Array.from({ length: Number(count) }, (_, marketId) =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_market",
      args: [marketId],
      jsonSafeReturn: true,
    }),
  );
  return Promise.all(requests).then((markets) => markets.map(marketFrom).sort((a, b) => Number(b.id - a.id)));
}

export async function readAccountedBalance(): Promise<bigint> {
  return asBigInt(
    await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: "accounted_balance" }),
  );
}

export async function readPosition(marketId: bigint, owner: string, outcome: "yes" | "no"): Promise<PositionRecord> {
  const raw = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_position",
    args: [Number(marketId), owner, outcome],
    jsonSafeReturn: true,
  });
  return positionFrom(raw);
}

export function walletClient(account: string, provider: EthereumProvider) {
  return createClient({
    chain: testnetBradbury,
    account: account as `0x${string}`,
    provider,
  });
}

function rpcErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "number" ? code : undefined;
}

function rpcErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; shortMessage?: unknown; details?: unknown; data?: { message?: unknown } };
    for (const candidate of [record.shortMessage, record.message, record.details, record.data?.message]) {
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
  }
  return fallback;
}

async function ensureBradburyNetwork(provider: EthereumProvider) {
  const expectedChainId = `0x${testnetBradbury.id.toString(16)}`;
  const currentChainId = await provider.request({ method: "eth_chainId" });
  if (currentChainId === expectedChainId) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: expectedChainId }],
    });
  } catch (error) {
    if (rpcErrorCode(error) !== 4902) {
      throw new Error(rpcErrorMessage(error, "Could not switch the wallet to GenLayer Bradbury."));
    }
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: expectedChainId,
        chainName: testnetBradbury.name,
        rpcUrls: testnetBradbury.rpcUrls.default.http,
        nativeCurrency: testnetBradbury.nativeCurrency,
        blockExplorerUrls: [testnetBradbury.blockExplorers?.default.url],
      }],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: expectedChainId }],
    });
  }

  const activeChainId = await provider.request({ method: "eth_chainId" });
  if (activeChainId !== expectedChainId) {
    throw new Error("Wallet is not connected to GenLayer Bradbury (chain ID 4221).");
  }
}

export async function sendContractTransaction(
  account: string,
  provider: EthereumProvider,
  functionName: string,
  args: Array<string | number | bigint>,
  value = 0n,
): Promise<{ hash: string; execution: string }> {
  const client = walletClient(account, provider);
  // `client.connect()` installs a MetaMask Snap. Rabby is already an EIP-1193
  // provider, so use standard wallet network methods instead of that MetaMask-only path.
  await ensureBradburyNetwork(provider);
  const hash = String(
    await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      value,
    }),
  );
  const receipt = await readClient.waitForTransactionReceipt({
    hash: hash as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    interval: 3_000,
    retries: 80,
  });
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(`Consensus accepted the transaction, but execution returned ${receipt.txExecutionResultName ?? "no result"}.`);
  }
  return { hash, execution: receipt.txExecutionResultName };
}
