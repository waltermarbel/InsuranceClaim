## 2025-02-14 - Prevent XSS in AI Chat & Analysis Modals
**Vulnerability:** User and model-generated content was being rendered as HTML via `dangerouslySetInnerHTML` without sanitization. This is a severe XSS risk if an attacker injects malicious scripts into the model prompt or inputs.
**Learning:** Found in `components/GeminiAssistant.tsx` and `components/ImageAnalysisModal.tsx`.
**Prevention:** Always use `DOMPurify.sanitize()` before passing any dynamic string to `dangerouslySetInnerHTML`. The dependency `dompurify` must be installed to do this properly.
