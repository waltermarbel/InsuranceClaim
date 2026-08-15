## 2024-05-01 - Prevent PII Leakage in Firebase Error Logs
**Vulnerability:** The application was exposing sensitive Personal Identifiable Information (PII) including email, displayName, and photoUrl from Firebase's `auth.currentUser.providerData` array in its error logs.
**Learning:** Firebase's `providerData` array contains sensitive user information by default. When mapping this data to custom error interfaces or logs, it is crucial to explicitly exclude these fields to avoid leaking PII into monitoring systems or application error reports.
**Prevention:** When logging authentication state or creating custom error objects involving Firebase auth data, explicitly map and filter the `providerData` to include only necessary, non-sensitive identifiers like `providerId`.
