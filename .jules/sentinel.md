## 2024-05-11 - [Prevent XSS in dangerouslySetInnerHTML]
**Vulnerability:** The `dangerouslySetInnerHTML` React prop was being used to render AI responses without sanitization in `GeminiAssistant.tsx` and `ImageAnalysisModal.tsx`.
**Learning:** Even if the expected input is plain text from an AI model, rendering text as HTML (especially using `.replace(/\n/g, '<br />')` which forces the use of `dangerouslySetInnerHTML`) opens up potential XSS vulnerabilities if the input source is compromised, manipulated, or if the model inadvertently generates script tags.
**Prevention:** Always wrap content passed to `dangerouslySetInnerHTML` with `DOMPurify.sanitize()` to ensure any malicious HTML or scripts are stripped before rendering.
