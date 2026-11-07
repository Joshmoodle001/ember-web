export class RequestBodyTooLargeError extends Error {
  constructor() { super("Request body exceeds the allowed byte limit."); this.name = "RequestBodyTooLargeError"; }
}

/** Bound buffering even when Content-Length is missing or inaccurate. */
export async function readLimitedText(request: Request, maxBytes: number): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error("Invalid request body limit.");
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > maxBytes) throw new RequestBodyTooLargeError();
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        try { await reader.cancel(); } catch { /* Reject oversized data even if transport cancellation fails. */ }
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
