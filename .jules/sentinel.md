## 2025-05-23 - Prevent PII Leakage in Error Logs
**Vulnerability:** PII (emails, display names) exposed in Firebase error structures thrown and logged.
**Learning:** Default auth provider mappings include sensitive metadata which can inadvertently leak into console logs and crash reports.
**Prevention:** Explicitly exclude PII fields from custom error interfaces and map only essential non-identifying data (like `userId` and `isAnonymous`).
