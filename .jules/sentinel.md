## 2025-03-08 - XSS via dangerouslySetInnerHTML
**Vulnerability:** XSS vulnerability through unsanitized use of `dangerouslySetInnerHTML` combined with AI generated output in `components/GeminiAssistant.tsx` and `components/ImageAnalysisModal.tsx`.
**Learning:** AI output should never be trusted, especially when dealing with unstructured data or potentially malicious injections via prompt data that may be reflected in the chat.
**Prevention:** Always use `DOMPurify.sanitize()` when injecting HTML derived from external or generated sources. The codebase has `dompurify` installed natively.
