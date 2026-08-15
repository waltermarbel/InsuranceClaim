## 2025-03-01 - PII Leak in Error Logs
**Vulnerability:** Personal Identifiable Information (PII) like email, displayName, and photoUrl from `auth.currentUser.providerData` were being included in error logs.
**Learning:** The Firebase `auth.currentUser.providerData` structure contains sensitive data by default, and mapping all its fields to a custom logging interface creates an accidental PII leak in error tracking systems.
**Prevention:** Explicitly pick and exclude PII fields when mapping from third-party structures to error tracking payload structures. Only map identifiers like `providerId`.
