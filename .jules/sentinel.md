## 2024-07-13 - PII Exposure in Error Logs
**Vulnerability:** Personally Identifiable Information (PII) like email and displayName were being exposed in application error logs when handling Firestore errors.
**Learning:** Firebase auth.currentUser.providerData array includes sensitive PII which can be inadvertently leaked when dumping whole objects into custom logging interfaces.
**Prevention:** Explicitly exclude sensitive fields like email and displayName when mapping Firebase auth state to error logs or thrown Error messages to prevent data exposure.
