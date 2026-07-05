## 2024-03-20 - XSS Vulnerability in React Text Rendering
**Vulnerability:** Unsanitized LLM responses were rendered directly to the DOM using dangerouslySetInnerHTML.
**Learning:** Using dangerouslySetInnerHTML simply to convert newlines to `<br />` tags introduces XSS risks when rendering untrusted or unpredictable strings.
**Prevention:** Use standard React rendering combined with the CSS property `whitespace-pre-wrap` (e.g. via Tailwind) to safely preserve newlines and text formatting without risking XSS.
