// Email-focused HTML sanitizers used by the editor

/** Allow only inline markup: strong/em/u/a/br. Unwrap common block containers. */
export function sanitizeInlineHtml(html: string): string {
  const root = document.createElement("div");
  root.innerHTML = html;

  const allowedInline = new Set(["strong", "em", "u", "a", "br"]);

  const unwrap = (el: Element) => {
    const frag = document.createDocumentFragment();
    while (el.firstChild) frag.appendChild(el.firstChild);
    el.replaceWith(frag);
  };

  (function walk(node: ParentNode) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType !== 1) return;
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (!allowedInline.has(tag)) {
        if (tag === "p" || tag === "div" || tag === "span" || tag.startsWith("h")) {
          while (el.attributes.length) el.removeAttribute(el.attributes[0].name);
          walk(el);
          unwrap(el);
          return;
        }
        const text = document.createTextNode(el.textContent || "");
        el.replaceWith(text);
        return;
      }

      if (tag === "a") {
        const href = el.getAttribute("href") || "";
        if (!/^(https?:|mailto:|tel:|#)/i.test(href)) el.removeAttribute("href");
        [...el.attributes].forEach((a) => {
          if (a.name.toLowerCase() !== "href") el.removeAttribute(a.name);
        });
        walk(el);
        return;
      }

      [...el.attributes].forEach((a) => el.removeAttribute(a.name));
      walk(el);
    });
  })(root);

  return root.innerHTML;
}

/** Paragraph/body sanitizer: allows a, br, strong/b, em/i, u, p, ol, ul, li, span (style: color/bg-color). */
export function sanitizeParaHtml(html: string): string {
  const root = document.createElement("div");
  root.innerHTML = html;

  // Pass 1: normalize lists (<ol> with only bullet items -> <ul>)
  const ols = Array.from(root.querySelectorAll("ol"));
  ols.forEach((ol) => {
    const lis = Array.from(ol.children).filter((c) => c.tagName?.toLowerCase() === "li");
    if (lis.length > 0 && lis.every((li) => (li.getAttribute("data-list") || "") === "bullet")) {
      const ul = document.createElement("ul");
      while (ol.firstChild) ul.appendChild(ol.firstChild);
      ol.replaceWith(ul);
    }
  });

  const allowed = new Set([
    "a",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "p",
    "ol",
    "ul",
    "li",
    "span",
  ]);

  const styleOk = (prop: string, val: string) => {
    const p = prop.trim().toLowerCase();
    const v = val.trim().toLowerCase();
    if (p !== "color" && p !== "background-color") return false;
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
    const rgb =
      /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.test(v);
    return hex || rgb;
  };

  (function walk(node: ParentNode) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType !== 1) return;
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (!allowed.has(tag)) {
        const text = document.createTextNode(el.textContent || "");
        el.replaceWith(text);
        return;
      }

      if (tag === "b" || tag === "i") {
        const replacement = document.createElement(tag === "b" ? "strong" : "em");
        replacement.innerHTML = el.innerHTML;
        el.replaceWith(replacement);
        walk(replacement);
        return;
      }

      if (tag === "a") {
        const href = el.getAttribute("href") || "";
        if (!/^(https?:|mailto:|tel:|#)/i.test(href)) el.removeAttribute("href");
        else el.setAttribute("href", href);
        [...el.attributes].forEach((a) => {
          if (a.name.toLowerCase() !== "href") el.removeAttribute(a.name);
        });
        walk(el);
        return;
      }

      if (tag === "li") {
        const cls = el.getAttribute("class") || "";
        const m = cls.match(/ql-indent-(\d+)/);
        const level = m ? Math.min(8, parseInt(m[1], 10) || 0) : 0;
        while (el.attributes.length) el.removeAttribute(el.attributes[0].name);
        if (level > 0) el.setAttribute("style", `margin-left:${level * 20}px`);
        walk(el);
        return;
      }

      if (tag === "span") {
        const styleAttr = el.getAttribute("style") || "";
        const styles = styleAttr
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);
        const kept: string[] = [];
        styles.forEach((pair) => {
          const idx = pair.indexOf(":");
          if (idx === -1) return;
          const prop = pair.slice(0, idx);
          const val = pair.slice(idx + 1);
          if (styleOk(prop, val)) kept.push(prop.trim().toLowerCase() + ":" + val.trim());
        });
        while (el.attributes.length) el.removeAttribute(el.attributes[0].name);
        if (kept.length) el.setAttribute("style", kept.join(";"));
        else {
          const frag = document.createDocumentFragment();
          while (el.firstChild) frag.appendChild(el.firstChild);
          el.replaceWith(frag);
          return;
        }
        walk(el);
        return;
      }

      [...el.attributes].forEach((a) => el.removeAttribute(a.name));
      walk(el);
    });
  })(root);

  return root.innerHTML;
}

export function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const isHex = (s: string): boolean => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s || "");
export function safeColor(c: string | undefined, fallback = "#667eea"): string {
  return isHex(c || "") ? (c as string) : fallback;
}

export default { sanitizeInlineHtml, sanitizeParaHtml, escapeText, isHex, safeColor };
