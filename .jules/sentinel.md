## 2024-05-18 - [Safe Newline Rendering over dangerouslySetInnerHTML]
**Vulnerability:** Found `dangerouslySetInnerHTML` being used to replace `\n` with `<br />` for rendering AI output, which poses an XSS risk.
**Learning:** For rendering plain text strings containing simple line breaks, replacing `\n` with HTML tags via `dangerouslySetInnerHTML` is unnecessary and dangerous. `react-markdown` may ignore single newlines per CommonMark.
**Prevention:** Use standard React text rendering (e.g. `{msg.text}`) combined with the CSS class `whitespace-pre-wrap` to safely preserve formatting and line breaks without exposing the app to XSS via unsanitized HTML injection.
