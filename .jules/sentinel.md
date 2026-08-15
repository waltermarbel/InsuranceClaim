## 2024-07-15 - PII Leakage in Firestore Error Logging
**Vulnerability:** Firebase auth context mapping included PII (email, displayName, photoUrl) in generic Firestore error logs.
**Learning:** Firebase's `auth.currentUser.providerData` array includes sensitive PII. Exposing this raw object in custom logging interfaces leads to PII leakage in application error logs.
**Prevention:** Explicitly pick only non-sensitive fields (like providerId) when mapping authentication state to error logs.
