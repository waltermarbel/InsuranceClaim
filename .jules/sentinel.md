## 2026-07-16 - PII Leakage in Firebase Error Logs
**Vulnerability:** Firebase's `auth.currentUser.providerData` array and `auth.currentUser.email` includes sensitive PII such as email, displayName, and photoUrl which were being exposed in application error logs via the `FirestoreErrorInfo` interface.
**Learning:** Firebase error handlers often map complete provider data natively. This implicitly captures PII into generic error logs. Such patterns are specific to Firebase auth context mappings into global application logs.
**Prevention:** Explicitly exclude PII fields (email, displayName, photoUrl) from custom error logging interfaces when mapping Firebase auth states. Only log non-sensitive attributes like providerId.
