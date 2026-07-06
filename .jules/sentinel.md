## 2024-07-06 - [Fix XSS vulnerability in LLM response rendering]
**Vulnerability:** XSS vulnerability through `dangerouslySetInnerHTML` in LLM response rendering (GeminiAssistant and ImageAnalysisModal).
**Learning:** `dangerouslySetInnerHTML` was unnecessarily used to render line breaks in plain text strings which could lead to XSS vulnerabilities if the LLM response contains malicious HTML.
**Prevention:** Use standard React rendering with the `whitespace-pre-wrap` CSS class to preserve newlines without introducing XSS risk for simple text.
