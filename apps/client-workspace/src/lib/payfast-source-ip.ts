import { isIP } from "node:net";

// PayFast publishes this list in its ITN documentation. Keep it current when PayFast changes it.
export const DEFAULT_PAYFAST_ITN_CIDRS = [
  "197.97.145.144/28",
  "41.74.179.192/27",
  "102.216.36.0/28",
  "102.216.36.128/28",
  "144.126.193.139/32",
] as const;

const IPV4_MASK = 0xffff_ffff;

function ipv4ToInteger(value: string) {
  if (isIP(value) !== 4) return null;
  return value.split(".").reduce((result, octet) => result * 256 + Number(octet), 0);
}

function parseCidr(value: string) {
  const [networkText, prefixText, ...extra] = value.split("/");
  if (!networkText || extra.length > 0) return null;

  const network = ipv4ToInteger(networkText);
  if (network === null) return null;
  const prefixLength = prefixText === undefined ? 32 : Number(prefixText);
  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) return null;

  const mask = prefixLength === 0 ? 0 : (IPV4_MASK << (32 - prefixLength)) >>> 0;
  if (((network & mask) >>> 0) !== network) return null;
  return { network, mask };
}

export function getPayFastItnCidrs(configured = process.env.PAYFAST_ITN_ALLOWED_CIDRS): readonly string[] | null {
  if (!configured?.trim()) return DEFAULT_PAYFAST_ITN_CIDRS;

  const cidrs = configured.split(",").map((cidr) => cidr.trim());
  if (cidrs.some((cidr) => !cidr || !parseCidr(cidr))) return null;
  return cidrs;
}

export function isPayFastItnIpAllowed(ip: string, cidrs: readonly string[] | null = getPayFastItnCidrs()) {
  const address = ipv4ToInteger(ip);
  if (address === null || !cidrs?.length) return false;
  return cidrs.some((cidr) => {
    const range = parseCidr(cidr);
    return range !== null && ((address & range.mask) >>> 0) === range.network;
  });
}

export function getVercelClientIp(
  headers: Headers,
  isVercel = process.env.VERCEL === "1",
  vercelEnvironment = process.env.VERCEL_ENV,
) {
  if (!isVercel || !["production", "preview"].includes(vercelEnvironment ?? "")) return null;
  const value = headers.get("x-vercel-forwarded-for")?.trim();
  if (!value || value.includes(",") || isIP(value) !== 4) return null;
  return value;
}

export function isTrustedPayFastItnSource(
  headers: Headers,
  isVercel = process.env.VERCEL === "1",
  vercelEnvironment = process.env.VERCEL_ENV,
) {
  const ip = getVercelClientIp(headers, isVercel, vercelEnvironment);
  return ip !== null && isPayFastItnIpAllowed(ip);
}
