## 2025-03-05 - Fix XSS Vulnerability in Rich Text Editor
**Vulnerability:** Found innerHTML assignment of potentially unsafe user input inside components/ClaimDetailsEditor.tsx.
**Learning:** React elements should not bypass standard escaping by directly editing the DOM via innerHTML unless absolutely necessary, and if so, it must be properly sanitized, especially for editable rich text components that save state on blur.
**Prevention:** Use DOMPurify for sanitizing any inputs before setting innerHTML in content editable components to prevent cross-site scripting (XSS) attacks.
