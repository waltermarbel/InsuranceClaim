## 2025-03-09 - PII Leakage in Error Logs
**Vulnerability:** Firebase auth state mapped to custom logging interfaces included sensitive PII (email, displayName, photoUrl) which leaked into application error logs.
**Learning:** Automatically including full user or providerData objects in logs inadvertently captures PII.
**Prevention:** Explicitly map and exclude sensitive fields (like email, displayName, photoUrl) when creating log objects from authentication state.
