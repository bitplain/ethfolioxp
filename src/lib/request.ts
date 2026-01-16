type HeaderValue = string | string[] | undefined;

function readHeader(headers: Headers | Record<string, HeaderValue> | undefined, name: string) {
  if (!headers) {
    return undefined;
  }
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? undefined;
  }
  const value = (headers as Record<string, HeaderValue>)[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function getClientIp(headers?: Headers | Record<string, HeaderValue>) {
  const trustProxy = process.env.TRUST_PROXY === "1";
  if (!trustProxy) {
    return "unknown";
  }
  const forwarded = readHeader(headers, "x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return readHeader(headers, "x-real-ip") || "unknown";
}
