#!/usr/bin/env node

/**
 * Manually process a webhook payload
 * Usage: node scripts/process-webhook.js <order-id> [base-url]
 */

const https = require('https');
const http = require('http');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
🔧 Manual Webhook Processor

Usage:
  node scripts/process-webhook.js <order-id> [base-url]

Example:
  node scripts/process-webhook.js 32d439cb-6880-4a60-9b63-efb4b8e30bdd https://jualdigital.id
  `);
  process.exit(1);
}

const orderId = args[0];
const baseUrl = args[1] || 'http://localhost:3000';

// Webhook payload from Xendit
const webhookPayload = {
  "id": "692beb5293cb592c78a87b0d",
  "items": [
    {
      "name": "CapCut Private",
      "price": 45000,
      "quantity": 1
    }
  ],
  "amount": 45000,
  "status": "PAID",
  "created": "2025-11-30T06:59:31.739Z",
  "is_high": false,
  "paid_at": "2025-11-30T06:59:42.856Z",
  "updated": "2025-11-30T06:59:44.641Z",
  "user_id": "680ef0d531a534396985a016",
  "currency": "IDR",
  "payment_id": "qrpy_0ab5cb70-1ca3-48f0-a19b-0571f6698f5e",
  "description": "Order ORD-2025-32d439 - Digital Products",
  "external_id": orderId,
  "paid_amount": 45000,
  "payer_email": "ekibagas99@gmail.com",
  "merchant_name": "Jual Digital",
  "payment_method": "QR_CODE",
  "payment_channel": "QRIS",
  "payment_details": {
    "source": "DANA",
    "receipt_id": ""
  },
  "payment_method_id": "pm-f07e8862-e3d5-49c1-ac15-71c64c215be3",
  "failure_redirect_url": `https://jualdigital.id/payment/failed?order_id=${orderId}`,
  "success_redirect_url": `https://jualdigital.id/payment/success?order_id=${orderId}`
};

const url = new URL(`${baseUrl}/api/payments/manual-update`);
const payload = JSON.stringify({
  orderId: orderId,
  webhookPayload: webhookPayload
});

const urlObj = new URL(url);
const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log(`\n🔄 Processing webhook for order: ${orderId}`);
console.log(`📡 Sending to: ${url}`);
console.log(`\n⏳ Processing...\n`);

const client = urlObj.protocol === 'https:' ? https : http;

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('✅ Webhook processed successfully!');
        console.log('\n📋 Response:');
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`❌ Webhook processing failed with status ${res.statusCode}`);
        console.log('\n📋 Response:');
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (e) {
      console.log('❌ Failed to parse response');
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  console.error('\n💡 Make sure your server is running and the URL is correct.');
});

req.write(payload);
req.end();

