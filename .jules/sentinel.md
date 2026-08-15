## 2025-07-27 - PII Leak in Firebase Error Logging
**Vulnerability:** Firebase `auth.currentUser.providerData` exposes sensitive user details (email, photoUrl, displayName) inside Firebase error handling logic (`firebase.ts`).
**Learning:** Mapping Firebase auth state to custom logging interfaces without filtering `providerData` fields leads to PII leakage in application error logs.
**Prevention:** Explicitly exclude sensitive PII fields (like `email`, `displayName`, and `photoUrl`) when logging `auth.currentUser.providerData`.
