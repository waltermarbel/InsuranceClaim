## 2023-10-27 - Remove PII leakage in Firestore error logs
**Vulnerability:** Firebase's `auth.currentUser.providerData` array includes sensitive PII (`email`, `displayName`, `photoUrl`), which was being leaked in Firestore error logs via `JSON.stringify()`.
**Learning:** Automatically serializing full `providerData` objects into error logs or custom structures easily exposes PII inadvertently.
**Prevention:** Explicitly map and exclude PII fields (like `email`, `displayName`, and `photoUrl`) when logging Firebase auth state.
