## 2026-08-28 - PII Leakage in Error Logs
**Vulnerability:** Firebase auth state mapped sensitive user information (emails, display names, profile photo URLs) directly into application error logs via `handleFirestoreError`.
**Learning:** Error handling utilities that indiscriminately serialize full authentication objects or provider data can inadvertently leak PII into system logs.
**Prevention:** When mapping external auth objects to custom logging interfaces, explicitly cherry-pick only non-sensitive identifiers (like UID or tenant ID) and exclude all PII.
