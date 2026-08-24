## 2026-05-13 - [Prevent PII Leakage in Error Handlers]
**Vulnerability:** Personally Identifiable Information (PII) including user emails, display names, and photo URLs were being captured by `handleFirestoreError` in `firebase.ts` and exposed via console logs and thrown errors.
**Learning:** Centralized error handlers that capture full `auth.currentUser` or provider data unintentionally leak sensitive user information into application logs, which can be scraped or viewed by unintended parties.
**Prevention:** Only log opaque identifiers like `userId`, `tenantId`, and `providerId`. Explicitly define an error interface (`FirestoreErrorInfo`) that excludes PII fields to enforce this constraint at compile-time.
