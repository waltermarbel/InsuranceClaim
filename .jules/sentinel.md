## 2025-03-05 - Prevent PII Leakage in Firebase Error Logs
**Vulnerability:** Firebase auth state mapped to custom logging interfaces was exposing PII (such as email, displayName, and photoUrl) in application error logs.
**Learning:** Firebase's `auth.currentUser.providerData` and `auth.currentUser` contain sensitive user info which should not be indiscriminately stringified into error logs.
**Prevention:** Explicitly exclude PII fields when mapping Firebase auth state to custom logging interfaces.
