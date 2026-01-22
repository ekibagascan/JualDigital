# DANA API Error 5005400 - General Error

## Issue Summary
We are consistently receiving `5005400` ("General Error") when attempting to create orders via the **Gapura Hosted Checkout** API with `scenario: "REDIRECT"`. Our request structure, signature, and authentication are all correct, but DANA's API is returning a server-side error.

## Error Details
- **Error Code**: `5005400`
- **Error Message**: "General Error"
- **API Endpoint**: `POST /payment-gateway/v1.0/debit/payment-host-to-host.htm`
- **Environment**: Sandbox (`https://api.sandbox.dana.id`)
- **Merchant ID**: 216620010010044503142
- **Partner Reference No**: `ORD-2026-58e721` (example from latest attempt)

## DANA API Response
```json
{
  "partnerReferenceNo": "ORD-2026-58e721",
  "responseCode": "5005400",
  "responseMessage": "General Error"
}
```

## What We've Verified
1. ✅ **Signature is valid** - We fixed the signature format to use `METHOD:PATH:lowercase(hex(SHA256(minified_body))):TIMESTAMP` and DANA is accepting it (no longer getting "Invalid Signature" errors)

2. ✅ **Request structure matches documentation** - All required fields are present:
   - `partnerReferenceNo`, `merchantId`, `amount`
   - `urlParams` with `PAY_RETURN` and `NOTIFICATION`
   - `additionalInfo.order.scenario = "REDIRECT"`
   - `additionalInfo.order.merchantTransType = "Retail"`
   - `additionalInfo.order.buyer` with `externalUserId` and `externalUserType`
   - `additionalInfo.order.goods` array
   - `additionalInfo.mcc = "5734"`
   - `additionalInfo.envInfo` with all required subfields

3. ✅ **Field formats are correct**:
   - Amount values: `"10000.00"` (with `.00` decimal)
   - Currency: `"IDR"`
   - Timestamp: `YYYY-MM-DDTHH:mm:ss+07:00` format
   - All string fields properly formatted

4. ✅ **Headers are correct**:
   - `X-PARTNER-ID`, `X-TIMESTAMP`, `X-SIGNATURE`, `X-EXTERNAL-ID`
   - `CHANNEL-ID: WEB`
   - `ORIGIN: https://jualdigital.id`

## Request Flow
1. **Previous errors resolved**:
   - ✅ Fixed `5005401` (Invalid Field Format) - added all required fields
   - ✅ Fixed "Invalid Signature" - corrected signature format
   - Now getting `5005400` (General Error)

2. **Current status**: Request is being accepted by DANA (signature valid, structure correct), but DANA's backend is returning a general server error.

## Questions for DANA Support
1. **What is causing the `5005400` error?** The generic message doesn't indicate the root cause.

2. **Is the merchant account fully configured** for hosted checkout (REDIRECT scenario)? Are there any pending approvals or missing configurations?

3. **Are there any restrictions on the values** we're using:
   - `mcc: "5734"` (Digital products)
   - `merchantTransType: "Retail"`
   - `sourcePlatform: "IPG"`
   - `terminalType: "SYSTEM"`
   - `clientIp: "0.0.0.0"` (should this be actual client IP?)

4. **Is there a working example** of a successful Create Order request for hosted checkout that we can compare against?

5. **Should we retry** these requests, or is there a configuration issue that needs to be fixed first?

## Request
Could you please:
1. Investigate why `5005400` errors are occurring for our merchant account
2. Verify the merchant account is fully activated and configured for hosted checkout
3. Provide guidance on any field values that need adjustment
4. Confirm if this is a temporary server issue or requires account configuration changes

**According to DANA documentation, `5005400` should be retried periodically, but we're getting it consistently on every request, which suggests a configuration or account setup issue rather than a transient server problem.**

Thank you for your assistance.
