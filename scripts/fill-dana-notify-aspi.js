const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

function generateTimestamp() {
  const now = new Date();
  const jakartaTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = jakartaTime.getUTCFullYear();
  const m = String(jakartaTime.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jakartaTime.getUTCDate()).padStart(2, "0");
  const h = String(jakartaTime.getUTCHours()).padStart(2, "0");
  const min = String(jakartaTime.getUTCMinutes()).padStart(2, "0");
  const s = String(jakartaTime.getUTCSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}:${s}+07:00`;
}

function formatPemKey(rawKey, type) {
  if (!rawKey) throw new Error(`DANA ${type} key is empty`);
  let k = rawKey.replace(/\\n/g, "\n").replace(/"/g, "").trim();
  k = k
    .replace(/-----BEGIN.*?-----\n?/g, "")
    .replace(/\n?-----END.*?-----/g, "")
    .replace(/\s+/g, "");
  const header = `-----BEGIN ${type} KEY-----\n`;
  const footer = `\n-----END ${type} KEY-----`;
  const formatted = k.match(/.{1,64}/g)?.join("\n") || k;
  return header + formatted + footer;
}

function generateSignatureBodyOnly(body, privateKey) {
  const minifiedBody = JSON.stringify(JSON.parse(body));
  const formattedKey = formatPemKey(privateKey, "PRIVATE");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(minifiedBody);
  sign.end();
  return sign.sign(formattedKey, "base64");
}

const partnerId = process.env.DANA_CLIENT_ID || process.env.DANA_PARTNER_ID;
const channelId = process.env.DANA_CHANNEL_ID || "WEB";
const merchantId = process.env.DANA_MERCHANT_ID;
const privateKey = process.env.DANA_PRIVATE_KEY;

if (!partnerId || !merchantId || !privateKey) {
  console.error(
    "Missing env: set DANA_CLIENT_ID (or DANA_PARTNER_ID), DANA_MERCHANT_ID, DANA_PRIVATE_KEY",
  );
  process.exit(1);
}

const timestamp = generateTimestamp();
const externalId = `${Date.now()}${Math.floor(Math.random() * 1e9)
  .toString()
  .padStart(9, "0")}`.slice(0, 36);

const bodyObj = {
  partnerReferenceNo: "ASPI-NOTIFY-TEST-001",
  latestTransactionStatus: "00",
  transTimestamp: timestamp,
  amount: { value: "15000.00", currency: "IDR" },
  originalPartnerReferenceNo: "ASPI-NOTIFY-TEST-001",
  partnerTxId: `DANA-${Date.now()}-SIM`,
  merchantId,
  additionalInfo: { paymentMethod: "DANA" },
};

const bodyString = JSON.stringify(bodyObj);
const signature = generateSignatureBodyOnly(bodyString, privateKey);

console.log("URI:");
console.log("https://jualdigital.id/api/payments/dana/callback");
console.log("X-TIMESTAMP:");
console.log(timestamp);
console.log("X-SIGNATURE:");
console.log(signature);
console.log("X-PARTNER-ID:");
console.log(partnerId);
console.log("X-EXTERNAL-ID:");
console.log(externalId);
console.log("CHANNEL-ID:");
console.log(channelId);
console.log("Body:");
console.log(bodyString);
