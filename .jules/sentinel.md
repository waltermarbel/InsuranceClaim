## 2024-05-18 - Prevent XSS in AI text output
**Vulnerability:** XSS vulnerability through usage of `dangerouslySetInnerHTML`.
**Learning:** `react-markdown` was used previously, but removing newlines manually using `<br />` and `dangerouslySetInnerHTML` for basic whitespace formatting exposes XSS vulnerabilities on user inputs or un-sanitized LLM responses.
**Prevention:** Utilizing the CSS class `whitespace-pre-wrap` with standard React text interpolation is a secure, clean alternative for preserving simple line breaks safely without XSS risk.
