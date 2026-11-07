import assert from "node:assert/strict";
import test from "node:test";
import { readLimitedText, RequestBodyTooLargeError } from "../src/lib/request-body.ts";

function streamingRequest(chunks, { headers = {}, onCancel, onPull } = {}) {
  let index = 0;
  const body = new ReadableStream({
    pull(controller) {
      onPull?.();
      if (index < chunks.length) controller.enqueue(chunks[index++]);
      else controller.close();
    },
    cancel(reason) { onCancel?.(reason); },
  }, { highWaterMark: 0 });
  return new Request("https://local.test/", { method: "POST", headers, body, duplex: "half" });
}

const bytes = (value) => new Uint8Array(Buffer.from(value, "utf8"));

test("caps a chunked body without Content-Length and cancels as soon as streamed bytes exceed the limit", async () => {
  let cancelled = false;
  let pulls = 0;
  const request = streamingRequest([bytes("12345"), bytes("must-not-be-read")], {
    onCancel: () => { cancelled = true; },
    onPull: () => { pulls += 1; },
  });

  assert.equal(request.headers.get("content-length"), null);
  await assert.rejects(readLimitedText(request, 4), RequestBodyTooLargeError);
  assert.equal(cancelled, true);
  assert.equal(pulls, 1, "the reader should cancel before requesting another chunk");
});

test("rejects an oversized declared body before reading it", async () => {
  let pulls = 0;
  const request = streamingRequest([bytes("{}")], {
    headers: { "content-length": "100" },
    onPull: () => { pulls += 1; },
  });

  await assert.rejects(readLimitedText(request, 10), RequestBodyTooLargeError);
  assert.equal(pulls, 0);
});

test("enforces the byte cap when Content-Length lies low", async () => {
  const request = streamingRequest([bytes("123"), bytes("456")], {
    headers: { "content-length": "2" },
  });

  await assert.rejects(readLimitedText(request, 5), RequestBodyTooLargeError);
});

test("counts UTF-8 bytes across split multibyte chunks and accepts valid JSON at the exact limit", async () => {
  const payload = JSON.stringify({ name: "José 🌍" });
  const encoded = Buffer.from(payload, "utf8");
  const split = payload.indexOf("🌍");
  const splitByte = Buffer.byteLength(payload.slice(0, split), "utf8") + 2;
  const request = streamingRequest([
    new Uint8Array(encoded.subarray(0, splitByte)),
    new Uint8Array(encoded.subarray(splitByte)),
  ]);

  const result = await readLimitedText(request, encoded.byteLength);
  assert.equal(result, payload);
  assert.deepEqual(JSON.parse(result), { name: "José 🌍" });
  assert.equal(Buffer.byteLength(result, "utf8"), encoded.byteLength);
});

test("rejects multibyte input one byte below its encoded size", async () => {
  const payload = JSON.stringify({ name: "🔥" });
  const encoded = Buffer.from(payload, "utf8");
  const request = streamingRequest([new Uint8Array(encoded)]);

  await assert.rejects(readLimitedText(request, encoded.byteLength - 1), RequestBodyTooLargeError);
});
