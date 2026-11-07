import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  createPayFastSignature,
  toPayFastItnParameterString,
  toPayFastItnValidationBody,
  verifyPayFastItnSignature,
} from "../src/lib/payfast.ts";

function phpUrlEncode(value) {
  let output = "";
  for (const byte of Buffer.from(value, "utf8")) {
    if (byte === 0x20) output += "+";
    else if (
      (byte >= 0x41 && byte <= 0x5a)
      || (byte >= 0x61 && byte <= 0x7a)
      || (byte >= 0x30 && byte <= 0x39)
      || byte === 0x2d
      || byte === 0x5f
      || byte === 0x2e
    ) output += String.fromCharCode(byte);
    else output += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return output;
}

function referenceItnSignature(fields, passphrase) {
  const parameters = fields.map(([key, value]) => `${key}=${phpUrlEncode(value)}`).join("&");
  return createHash("md5").update(`${parameters}&passphrase=${phpUrlEncode(passphrase)}`).digest("hex");
}

test("checkout signatures keep trimming and blank omission while using PHP form encoding", () => {
  const fields = [
    ["item_name", "  web* design  "],
    ["optional", ""],
  ];
  const expected = createHash("md5")
    .update("item_name=web%2A+design&passphrase=salt%2A")
    .digest("hex");

  assert.equal(createPayFastSignature(fields, " salt* "), expected);
});

test("ITN signature includes blank fields, preserves whitespace/order, and matches PHP urlencode", () => {
  const payload = [
    ["merchant_id", "10000100"],
    ["empty", ""],
    ["item_description", "  A+B* ~ café  "],
  ];
  const passphrase = " pass* ";
  const signature = referenceItnSignature(payload, passphrase);
  const fields = [...payload, ["signature", signature]];
  const expectedParameters = "merchant_id=10000100&empty=&item_description=++A%2BB%2A+%7E+caf%C3%A9++";

  assert.equal(phpUrlEncode(" !'()*~"), "+%21%27%28%29%2A%7E");
  assert.equal(toPayFastItnParameterString(fields), expectedParameters);
  assert.equal(toPayFastItnValidationBody(fields), expectedParameters);
  assert.equal(verifyPayFastItnSignature(fields, passphrase), true);
});

test("ITN signature changes when a signed value changes", () => {
  const payload = [["item_name", "Website"], ["custom_str1", ""]];
  const fields = [...payload, ["signature", referenceItnSignature(payload, "phrase")]];

  assert.equal(verifyPayFastItnSignature(fields, "phrase"), true);
  assert.equal(verifyPayFastItnSignature([["item_name", "Website "], ...fields.slice(1)], "phrase"), false);
  assert.equal(verifyPayFastItnSignature([["custom_str1", ""], ["item_name", "Website"], ...fields.slice(2)], "phrase"), false);
  assert.equal(verifyPayFastItnSignature(fields, "other phrase"), false);
});

test("ITN rejects missing, repeated, duplicate, or non-final signatures", () => {
  const signature = referenceItnSignature([["merchant_id", "10000100"]], "phrase");
  const validFields = [["merchant_id", "10000100"], ["signature", signature]];

  assert.equal(verifyPayFastItnSignature([["merchant_id", "10000100"]], "phrase"), false);
  assert.equal(verifyPayFastItnSignature([...validFields, ["signature", signature]], "phrase"), false);
  assert.equal(verifyPayFastItnSignature([["merchant_id", "10000100"], ["merchant_id", "10000100"], ["signature", signature]], "phrase"), false);
  assert.equal(verifyPayFastItnSignature([["merchant_id", "10000100"], ["signature", signature], ["payment_status", "COMPLETE"]], "phrase"), false);
  assert.equal(verifyPayFastItnSignature([["merchant_id", "10000100"], ["signature", "not-a-hash"]], "phrase"), false);
  assert.equal(toPayFastItnValidationBody([["merchant_id", "10000100"], ["signature", signature], ["tail", "ignored"]]), null);
});
