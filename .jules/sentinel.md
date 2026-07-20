## 2024-07-20 - Exposing PII via Firebase error logging
**Vulnerability:** The error handler `handleFirestoreError` in `firebase.ts` logs the full `auth.currentUser.providerData` array and `email` including sensitive PII (email, displayName, photoUrl) via `console.error` and exceptions.
**Learning:** Firebase's `auth.currentUser.providerData` array includes sensitive PII. When mapping Firebase auth state to custom logging interfaces, explicitly exclude these fields to avoid PII leakage in application error logs.
**Prevention:** Avoid blindly logging properties that map directly to users' profile information from identity providers (IdPs).
