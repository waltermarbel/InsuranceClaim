
## 2024-05-24 - React rendering of LLM responses XSS vulnerability
**Vulnerability:** Found `dangerouslySetInnerHTML` being used to render AI Assistant output with simple linebreaks.
**Learning:** Rendering LLM output using `dangerouslySetInnerHTML` exposes the app to Cross-Site Scripting (XSS) since the AI output is not sanitized and can contain malicious HTML/script injected by user prompts.
**Prevention:** Always use standard React text rendering for unsanitized data. When preserving simple line breaks, utilize the CSS property `whitespace-pre-wrap` alongside regular text nodes instead of `<br />` injected via HTML.
