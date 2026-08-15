## 2024-07-14 - PII Leakage in Firebase Error Logs
**Vulnerability:** Personally Identifiable Information (PII) including email, displayName, and photoUrl from Firebase auth providerData was being included in error objects and logged to the console.
**Learning:** Firebase's auth.currentUser.providerData array includes sensitive PII that can easily leak into application error logs when mapping auth state to custom error interfaces without explicit filtering.
**Prevention:** Always explicitly select and filter fields when mapping external authentication provider data to custom logging or error handling interfaces, specifically excluding PII fields like email, displayName, and photoUrl.
