import React, { useEffect, useMemo, useState, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "./editor.css";
import brandsData from "./brands.json";
import baseTemplate from "./template.html?raw";

/* ===================== BRANDS ===================== */
const isHex = (s) => typeof s === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);

const DEFAULT_CTA_COLOR = "#15ad36";

// ---- Mail-merge tags grouped by module ----
const MERGE_GROUPS = [
  {
    group: "Leads",
    items: [
      { label: "Lead Owner", value: "${Leads.Lead Owner}" },
      { label: "First Name", value: "${Leads.First Name}" },
      { label: "Last Name", value: "${Leads.Last Name}" },
    ],
  },
  {
    group: "Contacts",
    items: [{ label: "First Name", value: "${Contacts.First Name}" }],
  },
  {
    group: "Deals",
    items: [
      { label: "Deal Owner", value: "${Deals.Deal Owner}" },
      { label: "Club Name", value: "${Deals.Club Name}" },
      { label: "Deal Name", value: "${Deals.Deal Name}" },
      {
        label: "Unique Deal Reference",
        value: "${Deals.Unique Deal Reference}",
      },
      { label: "Invoice Number", value: "${Deals.Invoice Number}" },
      {
        label: "Delivery Contact Name",
        value: "${Deals.Delivery Contact Name}",
      },
    ],
  },
  {
    group: "Cases",
    items: [{ label: "Case Owner", value: "${Cases.Case Owner}" }],
  },
  {
    group: "General",
    items: [{ label: "User Signature", value: "${userSignature}" }],
  },
];

// Utility: filter groups by query, keeping order and dropping empty groups
const filterGroups = (q) => {
  const query = (q || "").trim().toLowerCase();
  if (!query) return MERGE_GROUPS;
  return MERGE_GROUPS.map((g) => ({
    group: g.group,
    items: g.items.filter(
      (t) => t.label.toLowerCase().includes(query) || t.value.toLowerCase().includes(query),
    ),
  })).filter((g) => g.items.length);
};

// Validate brand data and extract valid data into a new object
function validateBrands(data) {
  if (!data || typeof data !== "object") return null;

  const out = {};
  for (const [key, v] of Object.entries(data)) {
    const brandName = (v?.brandName && String(v.brandName).trim()) || key;
    const okHeaderFooter = v && typeof v.HEADER === "string" && typeof v.FOOTER === "string";

    const colors = v?.colors || {};
    const okColors =
      isHex(colors.primary || "") &&
      isHex(colors.accent || "") &&
      isHex(colors.text || "") &&
      isHex(colors.bg || "") &&
      isHex(colors.ctaColor || "");

    if (okHeaderFooter && okColors) {
      out[key] = {
        brandName,
        colors: {
          primary: colors.primary,
          accent: colors.accent,
          text: colors.text,
          bg: colors.bg,
          ctaColor: colors.ctaColor,
        },
        HEADER: v.HEADER,
        FOOTER: v.FOOTER,
      };
    } else {
      console.warn(
        `⚠️ Skipping invalid brand "${key}" — requires colors{primary,accent,text,bg}, defaults{ctaColor}, HEADER, FOOTER.`,
      );
    }
  }
  return Object.keys(out).length ? out : null;
}

/* ===================== Helpers: fences + sanitize ===================== */
const FENCE_RE = /<!--\s*editable:start([\s\S]*?)-->([\s\S]*?)<!--\s*editable:end\s*-->/g;

function parseAttrs(raw) {
  const out = {};
  const rx = /(\w+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = rx.exec(raw))) out[m[1]] = m[2];
  return out;
}

function getBlocks(html) {
  const blocks = [];
  let m;
  while ((m = FENCE_RE.exec(html))) {
    const attrs = parseAttrs(m[1] || "");
    const body = m[2] ?? "";
    const name = attrs.name || "";
    blocks.push({
      name,
      label: attrs.label || name || "(unnamed)",
      type: attrs.type || "textarea",
      max: attrs.max ? parseInt(attrs.max, 10) : undefined,
      fullMatch: m[0],
      start: m.index,
      end: m.index + m[0].length,
      body,
    });
  }
  return blocks;
}

function replaceBlock(html, name, newBody) {
  const re = new RegExp(
    `<!--\\s*editable:start([^>]*name="${name}"[^>]*)-->([\\s\\S]*?)<!--\\s*editable:end\\s*-->`,
    "m",
  );
  return html.replace(re, (_all, attrs) => {
    return `<!-- editable:start${attrs}-->${newBody}<!-- editable:end -->`;
  });
}

function escapeText(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Inline-only sanitizer for GREETING and SIGNOFF (bold/italic, links, <br>).
// Unwraps block tags like <p>/<div>, strips attributes, preserves safe <a href>.
function sanitizeInlineHtml(html) {
  const root = document.createElement("div");
  root.innerHTML = html;

  const allowedInline = new Set(["strong", "em", "u", "a", "br"]);

  const unwrap = (el) => {
    const frag = document.createDocumentFragment();
    while (el.firstChild) frag.appendChild(el.firstChild);
    el.replaceWith(frag);
  };

  (function walk(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType !== 1) return;
      const tag = child.tagName.toLowerCase();

      // Allow only inline tags; unwrap common block/neutral wrappers
      if (!allowedInline.has(tag)) {
        if (tag === "p" || tag === "div" || tag === "span" || tag.startsWith("h")) {
          // drop attributes & unwrap
          while (child.attributes.length) child.removeAttribute(child.attributes[0].name);
          walk(child);
          unwrap(child);
          return;
        }
        // Anything else becomes plain text
        const text = document.createTextNode(child.textContent || "");
        child.replaceWith(text);
        return;
      }

      if (tag === "a") {
        const href = child.getAttribute("href") || "";
        if (!/^(https?:|mailto:|tel:|#)/i.test(href)) child.removeAttribute("href");
        // Strip everything except href
        [...child.attributes].forEach((a) => {
          if (a.name.toLowerCase() !== "href") child.removeAttribute(a.name);
        });
        walk(child);
        return;
      }

      // strong/em/u/br: drop attributes and recurse
      [...child.attributes].forEach((a) => child.removeAttribute(a.name));
      walk(child);
    });
  })(root);

  return root.innerHTML;
}

// Sanitizer that also fixes Quill's bullet lists (<ol> -> <ul> when appropriate)
function sanitizeParaHtml(html) {
  const root = document.createElement("div");
  root.innerHTML = html;

  // --- PASS 1: Normalize list containers ---
  // Convert any <ol> that contains ONLY bullet items to <ul>
  const ols = Array.from(root.querySelectorAll("ol"));
  ols.forEach((ol) => {
    const lis = Array.from(ol.children).filter(
      (c) => c.tagName && c.tagName.toLowerCase() === "li",
    );
    if (lis.length > 0 && lis.every((li) => (li.getAttribute("data-list") || "") === "bullet")) {
      const ul = document.createElement("ul");
      // Move children over intact (we'll sanitize in pass 2)
      while (ol.firstChild) ul.appendChild(ol.firstChild);
      ol.replaceWith(ul);
    }
    // If mixed (some bullet, some ordered), we leave it as <ol> to avoid corrupting structure.
  });

  // --- PASS 2: Sanitize tags + attributes ---
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
    "span", // <— NEW for color/highlight
  ]);

  const styleOk = (prop, val) => {
    const p = prop.trim().toLowerCase();
    const v = val.trim().toLowerCase();

    if (p !== "color" && p !== "background-color") return false;

    // Accept hex (#rgb/#rrggbb) or rgb()/rgba()
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
    const rgb =
      /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.test(v);

    // If you want to enforce only brand palette (recommended for email),
    // turn this on by returning BRAND_COLORS.has(v) instead of (hex||rgb).
    const allowedByFormat = hex || rgb;

    // palette enforcement (toggle ON if desired)
    // return BRAND_COLORS.has(v);

    return allowedByFormat;
  };

  (function walk(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType !== 1) return;
      let tag = child.tagName.toLowerCase();

      if (!allowed.has(tag)) {
        const text = document.createTextNode(child.textContent || "");
        child.replaceWith(text);
        return;
      }

      // normalize <b>/<i> to semantic tags
      if (tag === "b" || tag === "i") {
        const replacement = document.createElement(tag === "b" ? "strong" : "em");
        replacement.innerHTML = child.innerHTML;
        child.replaceWith(replacement);
        walk(replacement);
        return;
      }

      if (tag === "a") {
        const href = child.getAttribute("href") || "";
        if (!/^(https?:|mailto:|tel:|#)/i.test(href)) {
          child.removeAttribute("href");
        } else {
          child.setAttribute("href", href);
        }
        [...child.attributes].forEach((a) => {
          if (a.name.toLowerCase() !== "href") child.removeAttribute(a.name);
        });
        walk(child);
        return;
      }

      // Lists: keep structure, strip classes; preserve indent via margin-left
      if (tag === "li") {
        const cls = child.getAttribute("class") || "";
        const m = cls.match(/ql-indent-(\d+)/);
        const level = m ? Math.min(8, parseInt(m[1], 10) || 0) : 0;
        while (child.attributes.length) child.removeAttribute(child.attributes[0].name);
        if (level > 0) child.setAttribute("style", `margin-left:${level * 20}px`);
        walk(child);
        return;
      }

      // NEW: spans for color/background — keep only allowed color styles
      if (tag === "span") {
        // rebuild a minimal style string with just color/background-color
        const styleAttr = child.getAttribute("style") || "";
        const styles = styleAttr
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);
        const kept = [];
        styles.forEach((pair) => {
          const idx = pair.indexOf(":");
          if (idx === -1) return;
          const prop = pair.slice(0, idx);
          const val = pair.slice(idx + 1);
          if (styleOk(prop, val)) kept.push(prop.trim().toLowerCase() + ":" + val.trim());
        });

        // drop all attributes, re-apply only the pruned style (if any)
        while (child.attributes.length) child.removeAttribute(child.attributes[0].name);
        if (kept.length) child.setAttribute("style", kept.join(";"));

        // if no valid styles left, we can either keep the span or unwrap it
        if (!kept.length) {
          // unwrap the span (safer/cleaner)
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          child.replaceWith(frag);
          return; // children already moved
        }

        walk(child);
        return;
      }

      // default: p/ol/ul/strong/em/u/br — strip all attrs
      [...child.attributes].forEach((a) => child.removeAttribute(a.name));
      walk(child);
    });
  })(root);

  return root.innerHTML;
}

/* ===================== Section builders ===================== */
const sectionHTML = {
  paragraph: (html) => `<div style="margin:0 0 24px 0; color:rgb(71, 85, 105)">${html}</div>`,
  cta: (label, href, color) =>
    `
<table cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td align="center" style="padding:8px 0 24px 0">
      <a class="btn" href="${href}" style="background:${color}; border-radius:6px; color:#fff; display:inline-block; font-weight:700; font-size:16px; line-height:44px; text-align:center; text-decoration:none; width:400px">
        ${escapeText(label)}
      </a>
    </td>
  </tr>
</table>`.trim(),
};

// Pure helper — no component state here
function safeColor(c, fallback = "#667eea") {
  return isHex(c || "") ? c : fallback;
}

/* ======================================================== */
/* =                                                      = */
/* ======================= MAIN APP ======================= */
/* =                                                      = */
/* ======================================================== */

export default function App() {
  const [brands, setBrands] = useState({}); // <— loaded from JSON
  const [brand, setBrand] = useState(""); // use first brand once loaded
  const [html, setHtml] = useState(() => baseTemplate.trim()); // base template

  // Modal state for raw HTML
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [exportedHtml, setExportedHtml] = useState("");

  const [sections, setSections] = useState([
    {
      id: cryptoRandom(),
      type: "paragraph",
      content:
        "Thank you for your kit enquiry, we hope we can help you with your team's kit needs and we are excited to help you bring your dream kit to life!",
    },
    {
      id: cryptoRandom(),
      type: "paragraph",
      content:
        "To get things moving quickly, it would be really helpful if you could provide a few more details ahead of our call. Please take a moment to fill out the form below so we can better understand your specific requirements.",
    },
    {
      id: cryptoRandom(),
      type: "cta",
      label: "CLICK HERE TO ADD MORE INFORMATION",
      href: "https://survey.myclubgroup.co.uk/zs/BBajDY?fromservice=ZCRM&zs_leads=${Leads.Lead Id}",
      color: DEFAULT_CTA_COLOR,
    },
    {
      id: cryptoRandom(),
      type: "paragraph",
      content:
        "We aim to follow up with you within the next day or so. If you have a preferred time for us to call, just let us know, and we'll do our best to accommodate.",
    },
    {
      id: cryptoRandom(),
      type: "paragraph",
      content:
        "Just a quick reminder: we have a minimum order of 10 items (e.g., 5 shirts/5 shorts), and all custom kit orders typically take 5-6 weeks to deliver.",
    },
    {
      id: cryptoRandom(),
      type: "paragraph",
      content:
        'In the meantime, if you\'d like to speak with someone, feel free to call us at 01883 772929 (Monday-Friday, 9am-5pm) or email us at <a href="mailto:customerservices@myclub.group">customerservices@myclub.group</a>.',
    },
  ]);

  const blocks = useMemo(() => getBlocks(html), [html]);
  const getBlockValue = (name) => (blocks.find((b) => b.name === name)?.body || "").trim();

  // Load brands from JSON and set initial brand if needed
  useEffect(() => {
    const validated = validateBrands(brandsData);
    if (validated) {
      setBrands(validated);
      if (!validated[brand]) {
        const first = Object.keys(validated)[0];
        if (first) setBrand(first);
      }
    } else {
      console.error("brands.json schema invalid or empty.");
    }
  }, []);

  // --- Brand-derived values (safe defaults if not loaded yet)
  const activeBrand = brands[brand];
  const brandColors = activeBrand?.colors ?? {
    primary: "#667eea",
    accent: "#3643ba",
    text: "#111827",
    bg: "#ffffff",
    ctaColor: "#667eea",
  };
  const brandDefaults = { ctaColor: brandColors.ctaColor };

  // run once to replace the initial fallback with the brand default after brands load
  const didRetrofitInitialCTA = useRef(false);

  useEffect(() => {
    if (didRetrofitInitialCTA.current) return;
    if (!Object.keys(brands).length) return; // brands not loaded yet

    setSections((prev) => {
      let changed = false;
      const next = prev.map((sec) => {
        if (sec.type !== "cta") return sec;

        // If color is missing, invalid, or equals our initial fallback, upgrade it.
        const col = sec.color;
        const isInitialFallback =
          typeof col === "string" && col.toLowerCase() === DEFAULT_CTA_COLOR.toLowerCase();

        if (!col || !isHex(col) || isInitialFallback) {
          changed = true;
          return { ...sec, color: brandDefaults.ctaColor };
        }
        return sec;
      });

      didRetrofitInitialCTA.current = true;
      return changed ? next : prev;
    });
  }, [brands, brandDefaults.ctaColor]);

  // --- Quill color palette + modules (hooks must be inside component)
  const quillPalette = useMemo(() => {
    const base = [
      brandColors.text,
      brandColors.primary,
      brandColors.accent,
      "#111827", // near-black
      "#334155", // slate-700
      "#0ea5e9", // accent blue
      "#10b981", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#6b7280", // gray
      "#000000", // black
    ];
    return Array.from(new Set(base.map((c) => c.toLowerCase())));
  }, [brandColors]);

  const quillModules = useMemo(
    () => ({
      toolbar: [
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ color: quillPalette }, { background: [] }],
        ["link"],
        ["clean"],
      ],
    }),
    [quillPalette],
  );
  const quillFormats = ["bold", "italic", "underline", "list", "color", "background", "link"];
  const quillMiniModules = useMemo(() => ({ toolbar: [["bold", "italic"], ["clean"]] }), []);
  const quillMiniFormats = ["bold", "italic"];

  // Rebuild HEADER/FOOTER when brand changes
  useEffect(() => {
    const b = brands[brand];
    if (!b) return; // no brands yet or invalid brand key

    setHtml((prev) => {
      let next = prev;
      const blocksNow = getBlocks(prev); // re-scan fences against current html

      if (blocksNow.find((blk) => blk.name === "HEADER")) {
        next = replaceBlock(next, "HEADER", `\n${b.HEADER}\n`);
      }
      if (blocksNow.find((blk) => blk.name === "FOOTER")) {
        next = replaceBlock(next, "FOOTER", `\n${b.FOOTER}\n`);
      }
      return next;
    });
  }, [brand, brands]);

  // Rebuild SECTIONS when sections change
  useEffect(() => {
    const bodyHtml = sections
      .map((s) => {
        if (s.type === "paragraph") {
          const safe = sanitizeParaHtml(s.content || "");
          return sectionHTML.paragraph(safe);
        }
        if (s.type === "cta") {
          const label = s.label || "Click here";
          const href = s.href || "https://example.com";
          const finalColor = safeColor(s.color, brandDefaults.ctaColor); // brand-aware fallback
          return sectionHTML.cta(label, href, finalColor);
        }
        return "";
      })
      .join("\n");

    setHtml((prev) => replaceBlock(prev, "SECTIONS", `\n${bodyHtml}\n`));
  }, [sections, brandDefaults.ctaColor]);

  // For inline fence fields (SNIPPET, GREETING, SIGNOFF), remove only
  // the padding newlines we insert around fences, but keep user spaces.
  function getInlineFence(html, name, blocks) {
    const body = blocks.find((b) => b.name === name)?.body ?? "";
    // remove exactly one leading and one trailing newline
    const unpadded = body.replace(/^\n/, "").replace(/\n$/, "");
    // inline fields show newlines as spaces, but DO NOT trim ends
    return unpadded.replace(/\n/g, " ");
  }

  const handleFenceChange = (name, value, type) => {
    const safe = type === "text" ? escapeText(value) : value;
    setHtml((prev) => replaceBlock(prev, name, `\n${safe}\n`));
  };

  const getFenceBody = (name) =>
    (blocks.find((b) => b.name === name)?.body ?? "").replace(/^\n/, "").replace(/\n$/, "");

  /* --------- Drag & drop for sections --------- */
  const draggingId = useRef(null);
  const onDragStart = (id) => (e) => {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (id) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (id) => (e) => {
    e.preventDefault();
    const fromId = draggingId.current;
    if (!fromId || fromId === id) return;
    const fromIdx = sections.findIndex((s) => s.id === fromId);
    const toIdx = sections.findIndex((s) => s.id === id);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...sections];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setSections(next);
    draggingId.current = null;
  };

  /* --------- Section operations --------- */
  const addParagraph = () =>
    setSections((s) => [
      ...s,
      { id: cryptoRandom(), type: "paragraph", content: "New paragraph..." },
    ]);
  const addCTA = () =>
    setSections((s) => [
      ...s,
      {
        id: cryptoRandom(),
        type: "cta",
        label: "CLICK HERE",
        href: "https://example.com",
        color: brandDefaults.ctaColor, // brand default at creation
      },
    ]);

  const removeSection = (id) => setSections((s) => s.filter((x) => x.id !== id));
  const updateSection = (id, patch) =>
    setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  /* --------- Import / Export JSON --------- */
  const exportJSON = () => {
    const json = {
      version: 2,
      brand,
      fields: {
        SNIPPET: getBlockValue("SNIPPET"),
        GREETING: getBlockValue("GREETING"),
        SIGNOFF: getBlockValue("SIGNOFF"),
      },
      sections,
    };
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Resolve an imported brand identifier (key or name) to a real brand key
  const resolveBrandKey = (val) => {
    if (!val) return null;
    const raw = String(val).trim();
    // exact key match
    if (brands[raw]) return raw;
    // name match (case-insensitive)
    const found = Object.entries(brands).find(
      ([k, b]) => (b.name || k).toLowerCase() === raw.toLowerCase(),
    );
    return found ? found[0] : null;
  };

  const importInputRef = useRef(null);
  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);

        // 1) Work out the desired brand from several possible fields
        const importedBrandValue =
          data.brandKey ?? data.brand ?? data.brand_name ?? data.brandName ?? data.name;

        const resolvedKey = resolveBrandKey(importedBrandValue);
        if (resolvedKey) {
          setBrand(resolvedKey);
        } else if (importedBrandValue) {
          // If brands haven't loaded yet or no match by name/key,
          // you can still stash the raw string; later effects will no-op until a match exists.
          setBrand(String(importedBrandValue));
        }
        // else: no brand info in file → keep current brand

        // 2) Sections: keep valid colors; otherwise leave undefined so render falls back to brand default
        if (Array.isArray(data.sections)) {
          const fixed = data.sections.map((s) => ({
            id: s.id || cryptoRandom(),
            type: s.type === "cta" ? "cta" : "paragraph",
            content: s.type === "paragraph" ? s.content || "" : undefined,
            label: s.type === "cta" ? s.label || "CLICK HERE" : undefined,
            href: s.type === "cta" ? s.href || "https://example.com" : undefined,
            // DON'T pull in brandDefaults here (brand might have just changed).
            // Leave undefined to allow runtime fallback: s.color || brandDefaults.ctaColor
            color: s.type === "cta" && isHex(s.color) ? s.color : undefined,
          }));
          setSections(fixed);
        }

        // 3) Inline fields
        const fields = data.fields || {};
        setHtml((prev) => {
          let h = prev;
          if (typeof fields.SNIPPET === "string")
            h = replaceBlock(h, "SNIPPET", `\n${escapeText(fields.SNIPPET)}\n`);
          if (typeof fields.GREETING === "string")
            h = replaceBlock(h, "GREETING", `\n${escapeText(fields.GREETING)}\n`);
          if (typeof fields.SIGNOFF === "string")
            h = replaceBlock(h, "SIGNOFF", `\n${escapeText(fields.SIGNOFF)}\n`);
          return h;
        });
      } catch (e) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  /* --------- Export HTML (modal + copy, strip comments) --------- */
  const openHtmlModal = () => {
    const stripped = html
      .replace(/<!--[\s\S]*?-->/g, "") // strip all comments (including fences)
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    setExportedHtml(stripped);
    setShowHtmlModal(true);
  };

  const copyHtmlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportedHtml);
      alert("HTML copied to clipboard!");
    } catch {
      alert("Could not copy. Select all and copy manually.");
    }
  };

  const downloadHtmlFile = () => {
    const blob = new Blob([exportedHtml || ""], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-${brand}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="editor-wrap">
        {/* Left panel: Editor */}
        <div className="panel">
          <h2
            style={{
              marginTop: 0,
              display: "flex",
              alignItems: "baseline",
              gap: 6,
            }}
          >
            Template Editor
            {typeof __BUILD_INFO__ !== "undefined" && (
              <span style={{ fontSize: "8px", color: "#666" }}>
                v{__BUILD_INFO__.buildNumber || __BUILD_INFO__.version}
              </span>
            )}
          </h2>
          <div className="pinnedExport">
            <button className="btn primary" onClick={openHtmlModal}>
              📋 Export HTML
            </button>
          </div>
          <div className="panel-body">
            {/* Brand */}
            <div className="row">
              <div className="label">Brand</div>
              <select
                className="select"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                style={{ width: "50%" }}
                disabled={!Object.keys(brands).length}
              >
                {Object.entries(brands).map(([key, b]) => (
                  <option key={key} value={key}>
                    {b.brandName || key}
                  </option>
                ))}
              </select>
              <div className="help">
                {Object.keys(brands).length
                  ? "Automatically updates HEADER and FOOTER."
                  : "Loading brands…"}
              </div>
            </div>

            {/* Fixed fields */}
            <FieldText
              label="Snippet Text"
              name="SNIPPET"
              value={getInlineFence(html, "SNIPPET", blocks)}
              onChange={(v) => handleFenceChange("SNIPPET", v, "text")}
              max={80}
            />
            <div style={{ marginBottom: 12 }}>
              <div className="label">Greeting</div>
              <div className="inline-quill">
                <ParagraphEditor
                  value={getFenceBody("GREETING")}
                  onChange={(val) => {
                    const safe = sanitizeInlineHtml(val || "");
                    setHtml((prev) => replaceBlock(prev, "GREETING", `\n${safe}\n`));
                  }}
                  modules={quillMiniModules}
                  formats={quillMiniFormats}
                />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div className="label">Sign-off Name</div>
              <div className="inline-quill">
                <ParagraphEditor
                  value={getFenceBody("SIGNOFF")}
                  onChange={(val) => {
                    const safe = sanitizeInlineHtml(val || "");
                    setHtml((prev) => replaceBlock(prev, "SIGNOFF", `\n${safe}\n`));
                  }}
                  modules={quillMiniModules}
                  formats={quillMiniFormats}
                />
              </div>
            </div>
            <div className="separator" />

            {/* Dynamic body sections */}
            <div
              className="row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div className="label">
                Body Sections <span className="badge">drag to reorder</span>
              </div>
              <div className="stack">
                <button className="btn add" onClick={addParagraph}>
                  ＋ Add Paragraph
                </button>
                <button className="btn add" onClick={addCTA}>
                  ＋ Add CTA
                </button>
              </div>
            </div>

            <div>
              {sections.map((s) => (
                <div
                  key={s.id}
                  className="card paragraph-section"
                  onDragOver={onDragOver(s.id)}
                  onDrop={onDrop(s.id)}
                  title="Drag to reorder"
                >
                  <div className="head">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {/* Hamburger is now the ONLY drag handle */}
                      <button
                        className="drag drag-handle"
                        draggable
                        onDragStart={onDragStart(s.id)}
                        onDragEnd={() => (draggingId.current = null)}
                        aria-label="Drag section"
                        type="button"
                      >
                        ☰
                      </button>
                      <span className="badge">
                        {s.type === "paragraph" ? "Paragraph" : "CTA Button"}
                      </span>
                    </div>
                    <button
                      className="btn remove"
                      onClick={() => removeSection(s.id)}
                      title="Remove"
                    >
                      − Remove
                    </button>
                  </div>
                  {s.type === "paragraph" ? (
                    <div>
                      <ParagraphEditor
                        value={s.content}
                        onChange={(val) => updateSection(s.id, { content: val })}
                        modules={quillModules}
                        formats={quillFormats}
                      />
                      {s.content && (
                        <button
                          type="button"
                          onClick={() => updateSection(s.id, { content: "" })}
                          className="clear-link"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* CTA fields stacked as block; inputs at 95% width */}
                      <div style={{ display: "block", gap: 8 }}>
                        <div style={{ marginBottom: 8 }}>
                          <div className="label">Button text</div>
                          <input
                            className="input"
                            type="text"
                            value={s.label}
                            onChange={(e) => updateSection(s.id, { label: e.target.value })}
                            style={{ width: "95%" }}
                          />
                          {s.label && (
                            <button
                              type="button"
                              onClick={() => updateSection(s.id, { label: "" })}
                              className="clear-link"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div>
                          <div className="label">Button URL</div>
                          <input
                            className="input"
                            type="text"
                            value={s.href}
                            onChange={(e) => updateSection(s.id, { href: e.target.value })}
                            style={{ width: "95%" }}
                            placeholder="https://…"
                          />
                          {s.href && (
                            <button
                              type="button"
                              onClick={() => updateSection(s.id, { href: "" })}
                              className="clear-link"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* CTA Color Picker */}
                      <div className="colorRow">
                        <div className="label">Button colour</div>
                        <div className="hex">
                          <input
                            type="color"
                            value={safeColor(s.color, brandDefaults.ctaColor)}
                            onChange={(e) => updateSection(s.id, { color: e.target.value })}
                            aria-label="CTA colour"
                          />
                          <input
                            className="input"
                            type="text"
                            value={safeColor(s.color, brandDefaults.ctaColor)}
                            onChange={(e) =>
                              updateSection(s.id, {
                                color: e.target.value.trim(),
                              })
                            }
                            placeholder={brandDefaults.ctaColor}
                            style={{ width: 120 }}
                          />
                          <span className="help">Hex (#RRGGBB)</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="separator" />

            {/* Actions */}
            <div className="stack">
              <label className="btn import" style={{ cursor: "pointer" }}>
                ⬆ Import JSON
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importJSON(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button className="btn export" onClick={exportJSON}>
                ⬇ Export JSON
              </button>
            </div>
          </div>
        </div>

        {/* Right panel: Live preview */}
        <div className="preview">
          <div className="title">Live Preview</div>
          <iframe
            title="preview"
            style={{ width: "100%", height: "150vh", border: "none" }}
            srcDoc={html}
          />
        </div>
      </div>

      {/* Modal for raw HTML */}
      {showHtmlModal && (
        <div className="modal-backdrop" onClick={() => setShowHtmlModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <strong>HTML</strong>
              <button className="btn remove" onClick={() => setShowHtmlModal(false)}>
                ✕ Close
              </button>
            </div>
            <div className="modal-body">
              <textarea readOnly value={exportedHtml} />
            </div>
            <div className="actions">
              <button className="btn info" onClick={copyHtmlToClipboard}>
                Copy to clipboard
              </button>
              <button className="btn info" onClick={downloadHtmlFile}>
                Download HTML
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===================== Small components & utils ===================== */
function FieldText({ label, name, value, onChange, max }) {
  const clearField = () => onChange("");

  return (
    <div style={{ marginBottom: 12, position: "relative" }}>
      <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
        {label} <small style={{ color: "#666" }}>({name})</small>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MergeInput value={value} onChange={onChange} maxLength={max} placeholder="" />
        {value && (
          <button type="button" onClick={clearField} className="clear-link">
            Clear
          </button>
        )}
      </div>
      {max ? (
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Max {max} characters</div>
      ) : null}
    </div>
  );
}

function cryptoRandom() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return `id_${a[0].toString(16)}`;
  }
  return `id_${Math.random().toString(16).slice(2)}`;
}

function ParagraphEditor({ value, onChange, modules, formats }) {
  const quillRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  const [triggerIndex, setTriggerIndex] = useState(null);
  const [active, setActive] = useState(0); // flat index across groups

  const filteredGroups = useMemo(() => filterGroups(query), [query]);
  const flat = useMemo(
    () => filteredGroups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.group }))),
    [filteredGroups],
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const quill = quillRef.current?.getEditor?.();
    if (!quill) return;
    const root = quill.root;

    const handleKeyDown = (e) => {
      if (e.key === "#") {
        e.preventDefault();
        const r = quill.getSelection(true);
        if (!r) return;
        quill.insertText(r.index, "#", "user");
        quill.setSelection(r.index + 1, 0, "user");
        const b = quill.getBounds(r.index + 1);
        setAnchor({ top: b.top + b.height + 6, left: b.left });
        setTriggerIndex(r.index);
        setQuery("");
        setActive(0);
        setOpen(true);
        return;
      }

      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (triggerIndex != null) quill.deleteText(triggerIndex, 1, "user");
        setOpen(false);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (!flat.length) return;
        const pick = flat[Math.max(0, Math.min(active, flat.length - 1))];
        if (triggerIndex != null) {
          quill.deleteText(triggerIndex, 1, "user");
          quill.insertText(triggerIndex, pick.value, "user");
          quill.setSelection(triggerIndex + pick.value.length, 0, "user");
        }
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(0, flat.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        if (query.length) setQuery((q) => q.slice(0, -1));
        else {
          if (triggerIndex != null) quill.deleteText(triggerIndex, 1, "user");
          setOpen(false);
        }
        return;
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setQuery((q) => q + e.key);
        const r = quill.getSelection(true);
        const b = quill.getBounds(r?.index ?? 0);
        setAnchor({ top: b.top + b.height + 6, left: b.left });
        return;
      }
    };

    root.addEventListener("keydown", handleKeyDown);
    return () => root.removeEventListener("keydown", handleKeyDown);
  }, [open, query, active, flat]);

  useEffect(() => {
    const quill = quillRef.current?.getEditor?.();
    if (!quill) return;
    const onSel = (range) => {
      if (!range) setOpen(false);
    };
    quill.on("selection-change", onSel);
    return () => quill.off?.("selection-change", onSel);
  }, []);

  const choose = (item) => {
    const quill = quillRef.current?.getEditor?.();
    if (!quill || triggerIndex == null) return;
    quill.deleteText(triggerIndex, 1, "user");
    quill.insertText(triggerIndex, item.value, "user");
    quill.setSelection(triggerIndex + item.value.length, 0, "user");
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        scrollingContainer={null}
      />
      {open && (
        <div
          className="tag-menu"
          style={{ top: anchor.top, left: anchor.left, position: "absolute" }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {flat.length ? (
            (() => {
              let ptr = 0; // running flat index for highlight / click
              return filteredGroups.map((g) => (
                <div className="group" key={g.group}>
                  <div className="group-title">{g.group}</div>
                  {g.items.map((it) => {
                    const idx = ptr++;
                    return (
                      <div
                        key={g.group + ":" + it.value}
                        className={`item ${idx === active ? "active" : ""}`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => choose(it)}
                      >
                        <span className="label">{it.label}</span>
                        <span className="val">{it.value}</span>
                      </div>
                    );
                  })}
                </div>
              ));
            })()
          ) : (
            <div className="item">
              <span className="label">No matches…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MergeInput({ value, onChange, maxLength, placeholder }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [triggerIndex, setTriggerIndex] = useState(null);
  const [active, setActive] = useState(0);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });

  const filteredGroups = useMemo(() => filterGroups(query), [query]);
  const flat = useMemo(
    () => filteredGroups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.group }))),
    [filteredGroups],
  );
  useEffect(() => {
    setActive(0);
  }, [query]);

  const openMenuAtInput = (caretIndex) => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ top: r.height + 6, left: 10 }); // simple anchor under the input
    setTriggerIndex(caretIndex);
    setQuery("");
    setActive(0);
    setOpen(true);
  };

  const insertAt = (text, start, end, insert) => {
    const before = text.slice(0, start);
    const after = text.slice(end);
    let next = before + insert + after;
    if (typeof maxLength === "number" && next.length > maxLength) {
      const allowed = maxLength - (text.length - (end - start));
      next = before + insert.slice(0, Math.max(0, allowed)) + after;
    }
    return next;
  };

  const choose = (item) => {
    const el = inputRef.current;
    if (!el || triggerIndex == null) return;
    const next = insertAt(value, triggerIndex, triggerIndex + 1, item.value);
    const caret = Math.min(next.length, triggerIndex + item.value.length);
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caret, caret);
    });
  };

  const onKeyDown = (e) => {
    const el = inputRef.current;
    if (!el) return;

    if (e.key === "#") {
      e.preventDefault();
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = insertAt(value, start, end, "#");
      onChange(next);
      openMenuAtInput(start);
      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(start + 1, start + 1);
      });
      return;
    }

    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      if (triggerIndex != null) {
        const next = insertAt(value, triggerIndex, triggerIndex + 1, "");
        onChange(next);
      }
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!flat.length) return;
      choose(flat[Math.max(0, Math.min(active, flat.length - 1))]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, flat.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      if (query.length) setQuery((q) => q.slice(0, -1));
      else {
        if (triggerIndex != null) {
          const next = insertAt(value, triggerIndex, triggerIndex + 1, "");
          onChange(next);
        }
        setOpen(false);
      }
      return;
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setQuery((q) => q + e.key);
      return;
    }
  };

  const onBlur = () => {
    if (open && triggerIndex != null) {
      const next = insertAt(value, triggerIndex, triggerIndex + 1, "");
      onChange(next);
    }
    setOpen(false);
  };

  return (
    <div className="merge-input-wrap" style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input
        ref={inputRef}
        className="input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        maxLength={maxLength}
        placeholder={placeholder}
        style={{
          width: "95%",
          padding: 8,
          boxSizing: "border-box",
          display: "block",
        }}
      />
      {open && (
        <div
          className="tag-menu"
          style={{ position: "absolute", top: anchor.top, left: anchor.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {flat.length ? (
            (() => {
              let ptr = 0;
              return filteredGroups.map((g) => (
                <div className="group" key={g.group}>
                  <div className="group-title">{g.group}</div>
                  {g.items.map((it) => {
                    const idx = ptr++;
                    return (
                      <div
                        key={g.group + ":" + it.value}
                        className={`item ${idx === active ? "active" : ""}`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => choose(it)}
                      >
                        <span className="label">{it.label}</span>
                        <span className="val">{it.value}</span>
                      </div>
                    );
                  })}
                </div>
              ));
            })()
          ) : (
            <div className="item">
              <span className="label">No matches…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
