import assert from "node:assert/strict";
import test from "node:test";

process.env.RENTAL_DOCUMENT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
const { decryptDocument, encryptRentalDocument } = require("./uploads") as typeof import("./uploads");

test("encrypts and decrypts licence documents with authenticated encryption", () => {
  const document = Buffer.from("%PDF-1.7 private licence data");
  assert.deepEqual(decryptDocument(encryptRentalDocument(document)), document);
});

test("rejects tampered encrypted licence documents", () => {
  const encrypted = encryptRentalDocument(Buffer.from("sensitive image bytes"));
  encrypted[encrypted.length - 1] ^= 0xff;
  assert.throws(() => decryptDocument(encrypted));
});
