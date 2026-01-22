# DANA API Support Request - Error 5005401

## Issue
Getting `5005401` error ("Internal Server Error") when creating orders via Hosted Checkout API with `scenario: "REDIRECT"`.

**Endpoint**: `POST /payment-gateway/v1.0/debit/payment-host-to-host.htm`  
**Environment**: Sandbox  
**Merchant ID**: 216620010010044503142

## Request Body
```json
{
  "partnerReferenceNo": "TEST-1768992159578",
  "merchantId": "216620010010044503142",
  "amount": { "value": "10000.00", "currency": "IDR" },
  "urlParams": [
    { "url": "https://jualdigital.id/payment/dana/finish", "type": "PAY_RETURN", "isDeeplink": "N" },
    { "url": "https://jualdigital.id/api/payments/dana/callback", "type": "NOTIFICATION", "isDeeplink": "N" }
  ],
  "additionalInfo": {
    "order": {
      "scenario": "REDIRECT",
      "orderTitle": "Test Order",
      "merchantTransType": "Retail",
      "buyer": { "externalUserId": "test@example.com", "externalUserType": "USER" },
      "goods": [{
        "category": "digital/product",
        "price": { "value": "10000.00", "currency": "IDR" },
        "description": "Test Product",
        "merchantGoodsId": "ITEM-1",
        "unit": "pcs",
        "quantity": "1"
      }]
    },
    "mcc": "5734",
    "envInfo": {
      "sessionId": "SESSION-1768992159578-abc123",
      "tokenId": "TOKEN-1768992159578",
      "websiteLanguage": "id_ID",
      "clientIp": "0.0.0.0",
      "osType": "WEB",
      "appVersion": "1.0.0",
      "sdkVersion": "1.0.0",
      "sourcePlatform": "IPG",
      "orderOsType": "WEB",
      "merchantAppVersion": "1.0.0",
      "terminalType": "SYSTEM",
      "orderTerminalType": "WEB"
    }
  }
}
```

## Headers
- `X-PARTNER-ID`: [Partner ID]
- `X-TIMESTAMP`: `2026-01-21T17:42:39+07:00`
- `X-SIGNATURE`: [RSA-SHA256 signature]
- `X-EXTERNAL-ID`: [Numeric, 1-36 chars]
- `CHANNEL-ID`: `WEB`
- `ORIGIN`: `https://jualdigital.id`

## Questions
1. Which specific field is causing the `5005401` error?
2. Are there missing required fields not in the docs?
3. Is the merchant account fully activated for hosted checkout?
4. Are the enum values correct (`mcc: "5734"`, `merchantTransType: "Retail"`, `sourcePlatform: "IPG"`, `terminalType: "SYSTEM"`)?

**Need**: Specific field causing the error and expected format/value.
