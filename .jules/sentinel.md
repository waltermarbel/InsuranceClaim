## 2024-07-12 - Prevent PII Exposure in Error Logs
**Vulnerability:** Firebase's `auth.currentUser.providerData` array and `auth.currentUser.email` contain sensitive PII (such as `email`, `displayName`, and `photoUrl`), which were being included in `FirestoreErrorInfo` and logged to the console/thrown in errors by `handleFirestoreError`.
**Learning:** When mapping Firebase auth state to custom logging interfaces or throwing errors, explicitly exclude these PII fields to avoid PII leakage in application error logs.
**Prevention:** Always manually select only non-PII fields (like `providerId`, `userId`, `tenantId`) when logging user auth context.
