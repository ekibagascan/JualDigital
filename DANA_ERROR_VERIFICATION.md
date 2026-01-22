# DANA Error Code Verification Guide

This document describes how to verify the two unverified DANA error scenarios.

## Unverified Error Codes

1. **4005401 - Invalid Field Format**
2. **4045418 - Inconsistent Request**

## Error Handling Implementation

Both error codes are now properly handled in `lib/dana.ts`:

- **4005401**: Detected when DANA returns this code, throws error with clear message about invalid field format
- **4045418**: Detected when DANA returns this code, throws error with clear message about inconsistent request

## How to Verify

### Method 1: Test Endpoint (Recommended)

The test endpoint now sends **raw requests directly to DANA API**, bypassing our validation logic to trigger specific error codes:

```bash
# Test 4005401 - Invalid Field Format
# Sends: invalid currency (USD), invalid amount format (no decimals), invalid enum (isDeeplink: 'INVALID')
curl -X POST https://jualdigital.id/api/payments/dana/test-errors \
  -H "Content-Type: application/json" \
  -d '{"testCase": "4005401"}'

# Test 4045418 - Inconsistent Request
# Sends: REDIRECT scenario without required urlParams
curl -X POST https://jualdigital.id/api/payments/dana/test-errors \
  -H "Content-Type: application/json" \
  -d '{"testCase": "4045418"}'
```

**Note**: The endpoint returns `verified: true` when DANA returns the expected error code, which should mark it as verified in the DANA dashboard.

### Method 2: Manual Testing

To manually trigger these errors:

**4005401 - Invalid Field Format:**
- Send request with invalid currency (e.g., "USD" instead of "IDR")
- Send request with invalid amount format (e.g., "10000" instead of "10000.00")
- Send request with invalid enum value (e.g., invalid scenario type)

**4045418 - Inconsistent Request:**
- Send request with missing required fields that depend on scenario
- Send request with amount mismatch between total and items
- Send request with missing urlParams when scenario requires it

## Verification Checklist

- [ ] Error code 4005401 is properly caught and logged
- [ ] Error code 4045418 is properly caught and logged
- [ ] Error messages are clear and descriptive
- [ ] Errors are properly thrown to caller
- [ ] Server logs show the error codes when they occur

## Current Implementation Status

✅ **Error Detection**: Both codes are detected in `lib/dana.ts`
✅ **Error Messages**: Clear, descriptive error messages for both codes
✅ **Logging**: Comprehensive logging when these errors occur
✅ **Error Propagation**: Errors are properly thrown to calling code

## Notes

- These errors will only occur when DANA's API actually returns these codes
- The test endpoint attempts to trigger these errors, but DANA may reject requests before they reach the API (validation on our side)
- To fully verify, you may need to work with DANA support to trigger these specific error scenarios in their sandbox environment

---

# DANA Webhook Response Verification Guide

This document describes how to verify DANA webhook response codes for Finish Notify webhooks.

## Webhook Response Requirements

DANA expects specific response codes from the Finish Notify webhook (`POST /api/payments/dana/callback`):

1. **2005600** - Successful acknowledgment (for both successful and closed/expired transactions)
2. **5005601** - Internal Server Error (for testing retry mechanism)

## Test Scenarios

### Scenario 1: Successful Transaction Response (2005600)

**Test Case**: DANA sends successful transaction (latestTransactionStatus = 00) notification

**Expected Response**:
```json
{
  "responseCode": "2005600",
  "responseMessage": "Successful"
}
```

**How to Test**:
```bash
curl -X POST https://jualdigital.id/api/payments/dana/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "testCase": "2005600-success",
    "partnerReferenceNo": "2020102900000000000001"
  }'
```

### Scenario 2: Internal Server Error Response (5005601)

**Test Case**: Simulate internal server error for successful transaction

**Expected Response**:
```json
{
  "responseCode": "5005601",
  "responseMessage": "Internal Server Error"
}
```

**In App Partner Action**: Mark Finish Notify process as Pending. Retry periodically within 7 days.

**How to Test (Internal Testing)**:
```bash
curl -X POST https://jualdigital.id/api/payments/dana/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "testCase": "5005601-error",
    "partnerReferenceNo": "2020102900000000000001"
  }'
```

**How to Verify with DANA (For DANA Dashboard Verification)**:

For DANA to mark this as verified in their dashboard, DANA needs to actually call your webhook and receive the `5005601` response. There are two ways to trigger this:

**Option 1: Configure Webhook URL with Query Parameter (Recommended for Testing)**

**Step-by-Step Instructions:**

1. **Go to DANA Dashboard** → Webhook Configuration
2. **Temporarily update your Finish Payment URL** (Finish Notify Webhook URL) to:
   ```
   https://jualdigital.id/api/payments/dana/callback?simulateError=true
   ```
   Or if using Vercel preview:
   ```
   https://jual-digital-4v36w3v9a-ebss-projects.vercel.app/api/payments/dana/callback?simulateError=true
   ```
3. **Click Save** in DANA Dashboard
4. **Trigger a test transaction** (or ask DANA support to send a test webhook)
5. **Verify the response**: DANA will receive `5005601` with "Internal Server Error"
6. **DANA will mark it as verified** in their dashboard
7. **IMPORTANT**: After verification, **remove the `?simulateError=true` parameter** from the webhook URL and save again

**To test if the query parameter works before DANA calls it:**
```bash
# Test the webhook directly with simulateError parameter
curl -X POST "https://jualdigital.id/api/payments/dana/callback?simulateError=true" \
  -H "Content-Type: application/json" \
  -H "X-SIGNATURE: test-signature" \
  -d '{
    "originalPartnerReferenceNo": "TEST-ORDER-001",
    "latestTransactionStatus": "00",
    "transactionStatusDesc": "SUCCESS"
  }'
# Expected response: {"responseCode":"5005601","responseMessage":"Internal Server Error"}
# HTTP Status: 500
```

**⚠️ IMPORTANT: Why It's Still Not Verified**

Even though our internal tests show the webhook returns `5005601` correctly, **DANA's dashboard verification requires DANA's own servers to call your webhook**. Our internal tests don't count for their verification system.

**Action Required:**

1. **Verify the webhook URL in DANA Dashboard includes the query parameter:**
   - Current URL should be: `https://jualdigital.id/api/payments/dana/callback?simulateError=true`
   - Make sure you clicked **Save** after updating it

2. **Have DANA send a webhook notification:**
   - **Option A**: Create a test transaction in DANA sandbox and complete it
   - **Option B**: Contact DANA support and ask them to trigger a test webhook to your URL
   - **Option C**: Wait for the next real transaction (if in production)

3. **After DANA sends the webhook:**
   - DANA's system will receive `5005601` response
   - DANA will automatically mark it as verified in their dashboard
   - You can check the dashboard after a few minutes

**Troubleshooting:**
- If the query parameter doesn't work, DANA might strip query parameters from webhook URLs
- In that case, use **Option 2** (Special Order Number Pattern) instead
- Contact DANA support if you need help triggering a test webhook
- Check your server logs to see if DANA has called the webhook recently

**Option 2: Use Special Order Number Pattern**
1. Create a test order with `partnerReferenceNo` starting with `TEST-5005601-` or `DANA-TEST-5005601-`
2. When DANA sends webhook for this order, it will automatically return `5005601`
3. Example: `partnerReferenceNo: "TEST-5005601-20240122-001"`

**Note**: The query parameter method affects ALL webhooks temporarily, so use it only for verification testing and remove it afterward.

### Scenario 3: Closed/Expired Transaction Response (2005600)

**Test Case**: DANA sends Closed/Expired transaction (latestTransactionStatus = 05) notification

**Expected Response**:
```json
{
  "responseCode": "2005600",
  "responseMessage": "Successful"
}
```

**In App Partner Action**: Mark Finish Notify process as Success

**How to Test**:
```bash
curl -X POST https://jualdigital.id/api/payments/dana/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "testCase": "2005600-expired",
    "partnerReferenceNo": "2020102900000000000001"
  }'
```

## Implementation Details

The webhook callback (`/api/payments/dana/callback`) has been updated to:

1. ✅ Return `2005600` with "Successful" for successful transactions (latestTransactionStatus = 00)
2. ✅ Return `2005600` with "Successful" for closed/expired transactions (latestTransactionStatus = 05)
3. ✅ Return `5005601` with "Internal Server Error" when simulating errors via:
   - Query parameter: `?simulateError=true` in webhook URL
   - Header: `X-SIMULATE-ERROR: true`
   - Special order number pattern: `TEST-5005601-*` or `DANA-TEST-5005601-*`
   - Environment variable: `DANA_SIMULATE_WEBHOOK_ERROR=true` (for internal testing)
4. ✅ Return `5005601` on actual processing errors (causes DANA to retry)

## Verification Checklist

- [ ] Successful transaction (00) returns 2005600 with "Successful"
- [ ] Closed/Expired transaction (05) returns 2005600 with "Successful"
- [ ] Internal server error simulation returns 5005601 with "Internal Server Error"
- [ ] Actual processing errors return 5005601 (triggers DANA retry)
- [ ] Response format matches DANA's expected structure exactly

## Current Implementation Status

✅ **Response Format**: Webhook returns DANA-compliant response codes
✅ **Success Response**: Returns 2005600 for both success and expired transactions
✅ **Error Response**: Returns 5005601 for internal server errors
✅ **Test Endpoint**: Created `/api/payments/dana/test-webhook` for testing all scenarios
✅ **Error Handling**: Proper error handling with correct response codes
