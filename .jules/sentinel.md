## 2024-05-14 - PII Leakage in Firestore Error Logging
**Vulnerability:** Firebase `auth.currentUser.providerData` contains sensitive PII (like `email`, `displayName`, `photoUrl`) which was being mapped directly into the application's `FirestoreErrorInfo` and logged to the console/error reporting during Firestore errors.
**Learning:** Default Firebase auth objects are overly permissive. Blindly mapping provider data into application error states risks leaking PII into logs or downstream monitoring systems.
**Prevention:** Explicitly exclude sensitive PII fields (like `email`, `displayName`, and `photoURL`) when mapping Firebase auth state to custom error logging interfaces. Only include necessary identifiers like `providerId`.
