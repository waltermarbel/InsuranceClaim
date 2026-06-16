## 2024-06-16 - Prevent XSS in LLM response rendering
**Vulnerability:** Used `dangerouslySetInnerHTML` to render LLM text responses simply to preserve newline (`\n`) formatting.
**Learning:** Using `dangerouslySetInnerHTML` for simple text formatting is a major security risk, especially with AI outputs that could be manipulated via prompt injection to emit malicious HTML.
**Prevention:** Instead of using HTML for simple text formatting, use standard React text rendering along with CSS properties like `whitespace-pre-wrap` to preserve line breaks securely.
