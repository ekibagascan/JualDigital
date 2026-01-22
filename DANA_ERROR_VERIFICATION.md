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

Use the test endpoint to verify error handling:

```bash
# Test 4005401 - Invalid Field Format
curl -X POST https://jualdigital.id/api/payments/dana/test-errors \
  -H "Content-Type: application/json" \
  -d '{"testCase": "4005401"}'

# Test 4045418 - Inconsistent Request  
curl -X POST https://jualdigital.id/api/payments/dana/test-errors \
  -H "Content-Type: application/json" \
  -d '{"testCase": "4045418"}'
```

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
