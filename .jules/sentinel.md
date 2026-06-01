## 2024-06-01 - Prevent XSS from LLM Responses in React
**Vulnerability:** Used `dangerouslySetInnerHTML` to render un-sanitized output from Gemini AI API calls within React components (`GeminiAssistant.tsx`, `ImageAnalysisModal.tsx`), allowing potential Cross-Site Scripting (XSS) if the LLM output contained malicious HTML/JavaScript.
**Learning:** Developers often use `dangerouslySetInnerHTML` to preserve newlines from LLM outputs. However, this is unsafe.
**Prevention:** Instead of using `dangerouslySetInnerHTML`, use React's standard text rendering (`{msg.text}`) combined with the CSS utility class `whitespace-pre-wrap` to safely preserve line breaks and formatting without parsing HTML.
