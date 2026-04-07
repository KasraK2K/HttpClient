import dns from "node:dns/promises";
import net from "node:net";

export interface OutboundRequestPolicy {
  allowPrivateNetworkTargets: boolean;
  allowedOutboundHosts: string[];
}

export type LookupAddress = {
  address: string;
  family: number;
};

export type LookupAll = (hostname: string) => Promise<LookupAddress[]>;

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase();
}

function ipv4ToNumber(address: string): number {
  return address
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .reduce((accumulator, part) => (accumulator << 8) + part, 0) >>> 0;
}

function isIpv4InCidr(address: string, network: string, prefixLength: number) {
  const mask =
    prefixLength === 0 ? 0 : ((0xffffffff << (32 - prefixLength)) >>> 0);

  return (
    (ipv4ToNumber(address) & mask) === (ipv4ToNumber(network) & mask)
  );
}

function isPrivateOrReservedIpv4(address: string): boolean {
  const ranges: Array<[string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];

  return ranges.some(([network, prefixLength]) =>
    isIpv4InCidr(address, network, prefixLength),
  );
}

function isPrivateOrReservedIpv6(address: string): boolean {
  const normalized = normalizeHostname(address);

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8")
  );
}

function isPrivateOrReservedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) {
    return isPrivateOrReservedIpv4(address);
  }

  if (family === 6) {
    return isPrivateOrReservedIpv6(address);
  }

  return false;
}

function isPrivateHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  );
}

async function defaultLookupAll(hostname: string): Promise<LookupAddress[]> {
  return dns.lookup(hostname, { all: true, verbatim: true });
}

export async function assertAllowedOutboundUrl(
  rawUrl: string,
  policy: OutboundRequestPolicy,
  lookupAll: LookupAll = defaultLookupAll,
): Promise<void> {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https request targets are allowed");
  }

  if (url.username || url.password) {
    throw new Error(
      "Credentials embedded in the request URL are not allowed",
    );
  }

  const hostname = normalizeHostname(url.hostname);
  if (policy.allowedOutboundHosts.length > 0) {
    const allowedHostnames = new Set(
      policy.allowedOutboundHosts.map(normalizeHostname),
    );
    if (!allowedHostnames.has(hostname)) {
      throw new Error(
        `Outbound requests are limited to the configured allowlist. ${hostname} is not permitted.`,
      );
    }
  }

  if (policy.allowPrivateNetworkTargets) {
    return;
  }

  if (isPrivateHostname(hostname)) {
    throw new Error(
      `Requests to local or private network targets are blocked: ${hostname}`,
    );
  }

  const resolvedAddresses =
    net.isIP(hostname) > 0
      ? [{ address: hostname, family: net.isIP(hostname) }]
      : await lookupAll(hostname);

  if (resolvedAddresses.length === 0) {
    throw new Error(`No IP addresses were resolved for ${hostname}`);
  }

  const blockedAddress = resolvedAddresses.find((address) =>
    isPrivateOrReservedAddress(address.address),
  );
  if (blockedAddress) {
    throw new Error(
      `Requests to local or private network targets are blocked: ${blockedAddress.address}`,
    );
  }
}

