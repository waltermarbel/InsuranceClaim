## 2024-05-14 - PII Leakage in Firebase Auth Logging
**Vulnerability:** Firebase auth state mapping to custom logging interfaces included sensitive PII like email, displayName, and photoUrl from `auth.currentUser.providerData`.
**Learning:** Default properties provided by external auth providers (like Firebase) often contain sensitive PII. Exposing these blindly to logging can lead to PII leaks.
**Prevention:** Always explicitly map only the necessary properties when logging auth objects, explicitly omitting PII fields.
