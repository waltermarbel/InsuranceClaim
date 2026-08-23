## 2025-03-05 - Fix PII leakage in Firestore Error Logs
**Vulnerability:** Firebase's `auth.currentUser.providerData` array was being mapped entirely into error logs, leaking sensitive PII like email, displayName, and photoUrl.
**Learning:** Error reporting utilities that blindly map authentication state objects without filtering can unintentionally leak PII into application logs.
**Prevention:** Explicitly exclude sensitive PII fields (e.g., email, displayName, photoUrl) when mapping Firebase auth state to custom logging interfaces.
