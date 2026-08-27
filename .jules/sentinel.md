## 2024-05-24 - PII Leakage in Firebase Auth Logging
**Vulnerability:** Firebase auth.currentUser.providerData array was being fully mapped and logged, exposing sensitive PII like email, displayName, and photoUrl in application error logs. Top level email was also exposed.
**Learning:** Firebase auth state mapping to custom logging interfaces needs explicit field exclusion to avoid unintentional PII leakage, as standard objects contain sensitive data that should not be persisted in logs or thrown in generic error messages.
**Prevention:** Always selectively pick non-sensitive fields (like providerId and userId) when mapping authentication context for error handling or logging interfaces.
