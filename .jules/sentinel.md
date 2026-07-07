## 2026-07-07 - Prevent XSS in UI Components
**Vulnerability:** React components (`GeminiAssistant.tsx`, `ImageAnalysisModal.tsx`) were rendering text via `dangerouslySetInnerHTML` which left the application open to Cross-Site Scripting (XSS) if the source was malicious.
**Learning:** Using `dangerouslySetInnerHTML` to handle newline spacing (`<br />`) exposes the application to XSS vulnerabilities.
**Prevention:** Rather than using `dangerouslySetInnerHTML`, safely escape output and handle newlines with CSS by using `whitespace-pre-wrap` on standard text rendering (e.g. `<p className="whitespace-pre-wrap">{text}</p>`).
