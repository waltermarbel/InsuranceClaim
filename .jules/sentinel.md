## 2024-08-26 - Prevent PII leakage in Firestore error logs
**Vulnerability:** Firebase `auth.currentUser.providerData` array was mapped to include sensitive PII (email, displayName, photoUrl) in the `FirestoreErrorInfo` interface, which is JSON.stringified and thrown in error logs.
**Learning:** Default Firebase user objects contain significant PII that must be explicitly excluded when mapping to custom logging structures to avoid leaking data during operation failures.
**Prevention:** Explicitly exclude PII fields like `email`, `displayName`, and `photoUrl` when mapping authentication context for error reporting, logging only necessary identifiers like `userId` and `providerId`.
