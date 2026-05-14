/**
 * Clean HTML pasted into a TipTap editor before ProseMirror parses it.
 *
 * Handles two recurring problems with pastes from rendered code blocks
 * (Confluence, GitHub, Storyblok previews, syntax-highlighted snippets):
 *
 * 1. Decorative / tracking `<img>` tags with no usable src get pasted as
 *    broken image placeholders. Strip them.
 * 2. Code that is rendered as an inline `<code>` (or as a `<pre>` whose
 *    children are syntax-highlight `<span>`/`<code>` tokens) loses its
 *    block structure. Newlines collapse into spaces, indentation is lost.
 *    Lift multi-line inline `<code>` into `<pre>`, and flatten `<pre>`
 *    contents to plain text so the code block survives the paste.
 */
export function cleanPastedHTML(html: string): string {
  if (typeof window === "undefined" || !html) return html;

  const container = document.createElement("div");
  container.innerHTML = html;

  // 1. Strip <img> tags without a usable src
  container.querySelectorAll("img").forEach((img) => {
    const src = (img.getAttribute("src") || "").trim();
    if (!src || src === "about:blank" || src.startsWith("data:,")) {
      img.remove();
    }
  });

  // 2. Lift multi-line inline <code> into a <pre> wrapper
  container.querySelectorAll("code").forEach((code) => {
    if (code.closest("pre")) return;
    const text = code.textContent || "";
    if (!text.includes("\n")) return;
    const pre = document.createElement("pre");
    code.parentNode?.insertBefore(pre, code);
    pre.appendChild(code);
  });

  // 3. Flatten <pre> contents to plain text so syntax-highlight spans
  //    or nested elements collapse to the underlying source code.
  container.querySelectorAll("pre").forEach((pre) => {
    const existingLang =
      (pre.className.match(/language-([\w-]+)/) ||
        pre.querySelector("code")?.className.match(/language-([\w-]+)/)) ?? null;
    const language = existingLang ? existingLang[1] : null;
    const text = pre.textContent || "";
    pre.innerHTML = "";
    const code = document.createElement("code");
    if (language) code.className = `language-${language}`;
    code.textContent = text;
    pre.appendChild(code);
  });

  return container.innerHTML;
}
