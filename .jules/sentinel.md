## 2025-07-16 - Prevent PII Leakage in Firebase Error Logs
**Vulnerability:** Sensitive PII (email, displayName, photoUrl) from Firebase auth state was mapped into custom logging interfaces, leading to PII leakage in application error logs.
**Learning:** Firebase's `auth.currentUser.providerData` array includes sensitive fields by default. Directly mapping this object into error logs exposes user privacy.
**Prevention:** Explicitly exclude PII fields like `email`, `displayName`, and `photoUrl` when mapping Firebase auth state to logging or error interfaces.
