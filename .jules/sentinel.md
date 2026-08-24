## 2024-05-27 - Zero-dependency XSS mitigation for React
**Vulnerability:** XSS risk via `dangerouslySetInnerHTML` when rendering un-sanitized LLM responses in `components/GeminiAssistant.tsx` and `components/ImageAnalysisModal.tsx`.
**Learning:** Using `dangerouslySetInnerHTML` just to preserve text formatting (like newlines) is an unnecessary security risk.
**Prevention:** Leverage the CSS property `whitespace-pre-wrap` (e.g., via Tailwind) for rendering un-sanitized text or LLM responses in React components to safely preserve newlines and formatting without risking XSS.
