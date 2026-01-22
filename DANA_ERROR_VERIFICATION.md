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

**How to Test**:
```bash
curl -X POST https://jualdigital.id/api/payments/dana/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "testCase": "5005601-error",
    "partnerReferenceNo": "2020102900000000000001"
  }'
```

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
3. ✅ Return `5005601` with "Internal Server Error" when simulating errors (via `?simulateError=true` query parameter or `X-SIMULATE-ERROR: true` header)
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
