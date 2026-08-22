## 2024-10-24 - PII Leakage in Firestore Error Logging
**Vulnerability:** Firebase auth state mapping exposed sensitive PII (email, displayName, photoUrl) in application error logs.
**Learning:** Default mapping of `auth.currentUser.providerData` captures all fields, inadvertently passing PII to custom error logging functions.
**Prevention:** Explicitly exclude PII fields when mapping authentication data for error logs, keeping only non-sensitive identifiers like `userId` and `providerId`.
