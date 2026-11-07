import { createHash, timingSafeEqual } from "node:crypto";

export type PayFastField = readonly [string, string];

function formEncode(value: string) {
  return new URLSearchParams([["v", value.trim()]]).toString().slice(2).replace(/\*/g, "%2A");
}

function formEncodeItn(value: string) {
  return new URLSearchParams([["v", value]]).toString().slice(2).replace(/\*/g, "%2A");
}

function validItnFields(fields: PayFastField[]) {
  if (fields.length === 0 || fields.at(-1)?.[0] !== "signature") return false;
  const names = new Set<string>();
  for (const [key] of fields) {
    if (names.has(key)) return false;
    names.add(key);
  }
  return true;
}

export function toPayFastItnParameterString(fields: PayFastField[]) {
  if (!validItnFields(fields)) return null;
  return fields.slice(0, -1).map(([key, value]) => `${key}=${formEncodeItn(value)}`).join("&");
}

export function createPayFastSignature(fields: PayFastField[], passphrase: string) {
  const values = fields.filter(([, value]) => value !== "");
  const parameters = values.map(([key, value]) => `${key}=${formEncode(value)}`).join("&");
  const signatureInput = `${parameters}&passphrase=${formEncode(passphrase)}`;
  return createHash("md5").update(signatureInput).digest("hex");
}

export function verifyPayFastItnSignature(fields: PayFastField[], passphrase: string) {
  if (!validItnFields(fields)) return false;
  const received = fields.at(-1)?.[1] ?? "";
  if (!/^[a-f0-9]{32}$/i.test(received)) return false;
  const parameters = toPayFastItnParameterString(fields);
  if (parameters === null) return false;
  const expected = createHash("md5")
    .update(`${parameters}&passphrase=${formEncodeItn(passphrase)}`)
    .digest("hex");
  const expectedBytes = Buffer.from(expected, "hex");
  const receivedBytes = Buffer.from(received, "hex");
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export function toPayFastItnValidationBody(fields: PayFastField[]) {
  return toPayFastItnParameterString(fields);
}
