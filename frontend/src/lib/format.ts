export const WEI_PER_GEN = 1_000_000_000_000_000_000n;

export function asBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return 0n;
}

export function formatGen(value: unknown, maximumFractionDigits = 4): string {
  const wei = asBigInt(value);
  const whole = wei / WEI_PER_GEN;
  const fraction = wei % WEI_PER_GEN;
  if (fraction === 0n) return whole.toString();
  const fractionText = fraction.toString().padStart(18, "0").slice(0, maximumFractionDigits).replace(/0+$/, "");
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

export function genToWei(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,18})?$/.test(normalized)) {
    throw new Error("Enter a GEN amount with up to 18 decimal places.");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const wei = BigInt(whole) * WEI_PER_GEN + BigInt(fraction.padEnd(18, "0"));
  if (wei <= 0n) throw new Error("Stake must be greater than zero.");
  return wei;
}

export function formatDate(timestamp: unknown): string {
  const normalizedTimestamp = typeof timestamp === "string" ? timestamp.trim().replace(/^"+|"+$/g, "") : timestamp;
  const parsedDate = typeof normalizedTimestamp === "string" && !/^\d+$/.test(normalizedTimestamp)
    ? Date.parse(normalizedTimestamp)
    : Number(asBigInt(timestamp)) * 1000;
  if (!Number.isFinite(parsedDate) || parsedDate <= 0) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsedDate));
}

export function countdown(timestamp: unknown, now: number): string {
  const seconds = Number(asBigInt(timestamp)) - Math.floor(now / 1000);
  if (seconds <= 0) return "Reached";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${minutes}m`;
}

export function shortAddress(address?: string): string {
  if (!address) return "Connect wallet";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
