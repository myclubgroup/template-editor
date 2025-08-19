import React, { useEffect, useMemo, useState, useRef } from "react";

/* ===================== Brand HTML blocks ===================== */
const brandBlocks = {
  myclub: {
    HEADER: `
<td align="center" style="padding:24px 32px; background:linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(10, 26, 54) 100%)">
  <img imgfilesize="4054" src="https://crm.zoho.eu/crm/viewInLineImage?fileContent=87972724af3582006b7c3e3104ee518703294fe114a5e654eb29439fef7fc12cc01bab2f9f213296ef943d3f42bf43616df27d9b85c54301cb3b6609123d80015d46c3cf8effbaae6690a928863d40363301ab2b56949a4b27fcacb6e6050574" align="middle">
</td>`.trim(),
    FOOTER: `
My Club Group and Decathlon My Club are trading names of My Club Europe PLC, registered in England &amp; Wales with company number 12087282. Registered office: 2 Oxted Chambers, 185-187 Station Road East, Oxted RH8 0QE.<br>
Decathlon is a registered trade mark of Decathlon SA and used under licence.
`.trim(),
  },
  decathlon: {
    HEADER: `
<td align="center" style="padding:24px 32px; background:linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(54, 67, 186) 100%)">
  <img imgfilesize="4222" src="https://crm.zoho.eu/crm/viewInLineImage?fileContent=16dd9ff341b5533854c3c0f4fb18f4f7fd77b29599b48e692b77e733cb65641f7c8549da1a3ea44ef2bd8b0c94186ed834a3ab3fd06e6c080b46f360737c67145053c285b5e16acc216ffdad9a8ef078140066b38edfd8339335623786c7a561" align="middle">
</td>`.trim(),
    FOOTER: `
Decathlon My Club and My Club Group are trading names of My Club Europe PLC, registered in England &amp; Wales with company number 12087282. Registered office: 2 Oxted Chambers, 185-187 Station Road East, Oxted RH8 0QE.<br>
Decathlon is a registered trade mark of Decathlon SA and used under licence.
`.trim(),
  },
};

/* ===================== Base template with fences ===================== */
const baseTemplate = `
<html><head>
  <meta charset="utf-8">
  <meta content="width=device-width" name="viewport">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection">
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important }
      .p32 { padding: 24px 16px !important }
      .p24 { padding: 16px !important }
      .stack { display: block !important; width: 100% !important }
      .btn { display: block !important; width: 100% !important }
      .tr-card { margin: 16px 0 !important }
      .right { text-align: left !important }
    }
  </style>
</head><body>
<div style="word-wrap:break-word; word-break:break-word; font-family:Arial, Helvetica, sans-serif; font-size:14px">

  <div style="display:none; max-height:0; overflow:hidden; font-size:1px; line-height:1px; color:rgb(254, 254, 254)">
    <!-- editable:start name="SNIPPET" label="Snippet Text" type="text" max="80" -->
    Thank you for your kit enquiry!
    <!-- editable:end -->
  </div>
  
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; background:rgb(248, 250, 252)">
    <tr>
      <td align="center" style="padding:20px 0">
        <table cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; background:rgb(255, 255, 255); border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0">
          <tr>
            <!-- editable:start name="HEADER" label="HEADER" type="rich" -->
            <!-- injected header -->
            <!-- editable:end -->
          </tr>

          <tr>
            <td class="p32" style="padding:32px; color:rgb(51, 65, 85); font-size:16px; line-height:1.5">
              
              <h1 style="margin:0 0 16px 0; font-size:18px; line-height:1.3; color:rgb(30, 41, 59); font-weight:700">
                <!-- editable:start name="GREETING" label="Greeting (H1)" type="text" max="120" -->
                Dear \${Leads.First Name},
                <!-- editable:end -->
              </h1>

              <!-- editable:start name="SECTIONS" label="Body Sections" type="rich" -->
              <!-- dynamic paragraphs and CTAs will be injected here -->
              <!-- editable:end -->

              <p style="margin:32px 0 0 0; color:rgb(71, 85, 105)">
                Best regards,<br>
                <strong style="color:rgb(30, 41, 59)">
                  <!-- editable:start name="SIGNOFF" label="Sign-off Name" type="text" max="120" -->
                  \${Leads.Lead Owner}
                  <!-- editable:end -->
                </strong>
              </p>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding:24px 32px; background:rgb(241, 245, 249); border-top:1px solid rgb(226, 232, 240)">
              <p style="margin:0; font-size:8px; line-height:1.5; color:rgb(100, 116, 139)">
                <!-- editable:start name="FOOTER" label="FOOTER" type="rich" -->
                <!-- injected footer -->
                <!-- editable:end -->
              </p>
            </td>
          </tr>
        </table>

        <div style="display:none; white-space:nowrap; font:15px / 0 courier">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      </td>
    </tr>
  </table>
</div>
</body></html>
`.trim();

/* ===================== Helpers: fences + sanitize ===================== */
const FENCE_RE =
  /<!--\s*editable:start([\s\S]*?)-->([\s\S]*?)<!--\s*editable:end\s*-->/g;

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
    "m"
  );
  return html.replace(re, (_all, attrs) => {
    return `<!-- editable:start${attrs}-->${newBody}<!-- editable:end -->`;
  });
}

function escapeText(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// very small allowlist for paragraph rich text (a, br, strong, em)
function sanitizeParaHtml(s) {
  const div = document.createElement("div");
  div.innerHTML = s;
  const allowed = new Set(["a", "br", "strong", "em"]);
  (function walk(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        if (!allowed.has(tag)) {
          const text = document.createTextNode(child.textContent || "");
          child.replaceWith(text);
        } else {
          if (tag === "a") {
            const href = child.getAttribute("href") || "";
            if (!/^(https?:|mailto:|tel:|#)/i.test(href)) {
              child.removeAttribute("href");
            }
            [...child.attributes].forEach((a) => {
              if (a.name.toLowerCase() !== "href") child.removeAttribute(a.name);
            });
          } else {
            [...child.attributes].forEach((a) => child.removeAttribute(a.name));
          }
          walk(child);
        }
      }
    });
  })(div);
  return div.innerHTML;
}

/* ===================== Section builders ===================== */
const DEFAULT_CTA_COLOR = "#667eea";

const sectionHTML = {
  paragraph: (html) =>
    `<p style="margin:0 0 24px 0; color:rgb(71, 85, 105)">${html}</p>`,
  cta: (label, href, color) => `
<table cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td align="center" style="padding:8px 0 24px 0">
      <a class="btn" href="${href}" style="background:${safeColor(
    color
  )}; border-radius:6px; color:#fff; display:inline-block; font-weight:700; font-size:16px; line-height:44px; text-align:center; text-decoration:none; width:400px">
        ${escapeText(label)}
      </a>
    </td>
  </tr>
</table>`.trim(),
};

function safeColor(c) {
  if (typeof c === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c;
  return DEFAULT_CTA_COLOR;
}

/* ===================== Pretty CSS (no libs) ===================== */
const editorCSS = `
:root{
  --bg:#0b1220; --card:#101729; --muted:#9aa4b2; --text:#e6ebf5; --brand:#667eea; --brand2:#3643ba; --ok:#16a34a;
}
body{background:#0b1220;}
.editor-wrap{display:grid;grid-template-columns:560px 1fr;gap:16px;padding:16px}
@media (max-width:1100px){.editor-wrap{grid-template-columns:1fr}}
.panel{background:var(--card);border:1px solid #1d2640;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.35);color:var(--text)}
.panel h2{margin:0;padding:14px 16px;border-bottom:1px solid #1d2640;background:linear-gradient(135deg, #101729, #0d1424)}
.panel-body{padding:14px 16px}
.label{font-weight:600;margin-bottom:6px;color:#d7def1}
.help{font-size:12px;color:var(--muted)}
.row{margin-bottom:12px}
.input, .select, .btn{
  border-radius:10px;border:1px solid #27314f;
  padding:10px 12px;outline:none
}
.clear-link {border: none;background: transparent;color: #007bff;cursor: pointer;font-size: 12px;padding: 0;}
.clear-link:hover {color: #d97706;text-decoration: underline;}
.input:focus, .select:focus{box-shadow:0 0 0 2px rgba(102,126,234,.35);border-color:#3b49a1}
.btn{display:inline-flex;gap:8px;align-items:center;cursor:pointer;transition:.15s ease;border-color:#2a3660}
.btn.primary{background:linear-gradient(135deg, var(--brand), var(--brand2));border-color:transparent;color:#fff}
.btn.import{background:linear-gradient(135deg,#10b981,#059669);border-color:transparent;color:#fff;font-size:12px}
.btn.export{background:linear-gradient(135deg,#6210b9,#334782);border-color:transparent;color:#fff;font-size:12px}
.btn.remove{border-color:#7f1d1d}
.btn.remove:hover{background:#b91c1c;color:#fff;border-color:#7f1d1d}
.btn.add{border-color:#065f46}
.btn.add:hover{background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-color:transparent}
.btn.info{background:linear-gradient(135deg,#60a5fa,#38bdf8);border-color:transparent;color:#0b1220}
.btn.info:hover{background:linear-gradient(135deg,#93c5fd,#60a5fa);color:#0b1220}
.stack{display:flex;gap:8px;flex-wrap:wrap}
.card{border:1px solid #27314f;background:#0c1428;border-radius:12px;padding:10px}
.card .head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.badge{font-size:12px;color:#b9c2d0;background:#111a31;border:1px solid #27314f;padding:2px 8px;border-radius:999px}
.drag{cursor:grab;user-select:none}
.preview{background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden}
.preview .title{font-size:12px;padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;background:#f9fafb}
iframe{background:#fff}
.separator{height:1px;background:#1d2640;margin:12px 0}
small.k{color:#b9c2d0}
.colorRow{display:grid;grid-template-columns:110px 1fr;gap:8px;align-items:center;margin-top:8px}
.colorRow input[type="color"]{width:44px;height:36px;border:none;background:transparent;padding:0;cursor:pointer}
.colorRow .hex{display:flex;gap:8px;align-items:center}
.pinnedExport{
  position:absolute;
  top:12px;
  right:12px;
}
.panel{position:relative;} /* allow absolute positioning inside */

/* Modal */
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:50}
.modal{width:min(920px,92vw);max-height:86vh;background:#0e162c;border:1px solid #27314f;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden;color:#e6ebf5}
.modal .modal-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #27314f;background:linear-gradient(135deg,#101729,#0d1424)}
.modal .modal-body{padding:12px 14px}
.modal textarea{width:100%;height:60vh;border:1px solid #27314f;border-radius:10px;padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}
.modal .actions{display:flex;gap:8px;justify-content:flex-end;padding:12px 14px;border-top:1px solid #27314f}
`;

/* ===================== Main App ===================== */
export default function App() {
  const [brand, setBrand] = useState("myclub"); // 'myclub' | 'decathlon'
  const [html, setHtml] = useState(baseTemplate);

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
      href:
        "https://survey.myclubgroup.co.uk/zs/BBajDY?fromservice=ZCRM&zs_leads=${Leads.Lead Id}",
      color: DEFAULT_CTA_COLOR,
    },
    {
      id: cryptoRandom(),
      type: "paragraph",
      content:
        "We aim to follow up with you within the next day or so. If you have a preferred time for us to call, just let us know, and we’ll do our best to accommodate.",
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
        'In the meantime, if you’d like to speak with someone, feel free to call us at 01883 772929 (Monday-Friday, 9am-5pm) or email us at <a href="mailto:customerservices@myclub.group">customerservices@myclub.group</a>.',
    },
  ]);

  const blocks = useMemo(() => getBlocks(html), [html]);
  const getBlockValue = (name) =>
    (blocks.find((b) => b.name === name)?.body || "").trim();

  // Inject HEADER/FOOTER when brand changes
  useEffect(() => {
    let h = html;
    if (blocks.find((b) => b.name === "HEADER")) {
      h = replaceBlock(h, "HEADER", `\n${brandBlocks[brand].HEADER}\n`);
    }
    if (blocks.find((b) => b.name === "FOOTER")) {
      h = replaceBlock(h, "FOOTER", `\n${brandBlocks[brand].FOOTER}\n`);
    }
    setHtml(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

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
          const color = s.color || DEFAULT_CTA_COLOR;
          return sectionHTML.cta(label, href, color);
        }
        return "";
      })
      .join("\n");
    setHtml((prev) => replaceBlock(prev, "SECTIONS", `\n${bodyHtml}\n`));
  }, [sections]);

  const handleFenceChange = (name, value, type) => {
    const safe = type === "text" ? escapeText(value) : value;
    setHtml((prev) => replaceBlock(prev, name, `\n${safe}\n`));
  };

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
        label: "Click here",
        href: "https://example.com",
        color: DEFAULT_CTA_COLOR,
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

  const importInputRef = useRef(null);
  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.brand && (data.brand === "myclub" || data.brand === "decathlon")) {
          setBrand(data.brand);
        }
        if (Array.isArray(data.sections)) {
          const fixed = data.sections.map((s) => ({
            id: s.id || cryptoRandom(),
            type: s.type === "cta" ? "cta" : "paragraph",
            content: s.type === "paragraph" ? (s.content || "") : undefined,
            label: s.type === "cta" ? (s.label || "Click here") : undefined,
            href: s.type === "cta" ? (s.href || "https://example.com") : undefined,
            color: s.type === "cta" ? safeColor(s.color || DEFAULT_CTA_COLOR) : undefined,
          }));
          setSections(fixed);
        }
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
      .replace(/<!--[\s\S]*?-->/g, "")   // strip all comments (including fences)
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
    const blob = new Blob([exportedHtml || ""], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-${brand}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{editorCSS}</style>

      <div className="editor-wrap">
        {/* Left panel: Editor */}
        <div className="panel">
          <h2>Email Editor</h2>
          <div className="pinnedExport">
            <button className="btn primary" onClick={openHtmlModal}>📋 Export HTML</button>
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
              >
                <option value="myclub">My Club</option>
                <option value="decathlon">Decathlon Club</option>
              </select>
              <div className="help">Automatically updates HEADER and FOOTER.</div>
            </div>

            {/* Fixed fields */}
            <FieldText
              label="Snippet Text"
              name="SNIPPET"
              value={getBlockValue("SNIPPET").replace(/\n/g, " ").trim()}
              onChange={(v) => handleFenceChange("SNIPPET", v, "text")}
              max={80}
            />
            <FieldText
              label="Greeting (H1)"
              name="GREETING"
              value={getBlockValue("GREETING").replace(/\n/g, " ").trim()}
              onChange={(v) => handleFenceChange("GREETING", v, "text")}
              max={120}
            />
            <FieldText
              label="Sign-off Name"
              name="SIGNOFF"
              value={getBlockValue("SIGNOFF").replace(/\n/g, " ").trim()}
              onChange={(v) => handleFenceChange("SIGNOFF", v, "text")}
              max={120}
            />

            <div className="separator" />

            {/* Dynamic body sections */}
            <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="label">Body Sections <span className="badge">drag to reorder</span></div>
              <div className="stack">
                <button className="btn add" onClick={addParagraph}>＋ Add Paragraph</button>
                <button className="btn add" onClick={addCTA}>＋ Add CTA</button>
              </div>
            </div>

            <div>
              {sections.map((s) => (
                <div
                  key={s.id}
                  className="card"
                  draggable
                  onDragStart={onDragStart(s.id)}
                  onDragOver={onDragOver(s.id)}
                  onDrop={onDrop(s.id)}
                  title="Drag to reorder"
                >
                  <div className="head">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="drag">☰</span>
                      <span className="badge">{s.type === "paragraph" ? "Paragraph" : "CTA Button"}</span>
                    </div>
                    <button className="btn remove" onClick={() => removeSection(s.id)} title="Remove">− Remove</button>

                  </div>

                  {s.type === "paragraph" ? (
                    <div>
                      <div className="help" style={{ marginBottom: 6 }}>
                        Paragraph text (allows: &lt;a&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;br /&gt;)
                      </div>
                      <textarea
                        value={s.content}
                        rows={3}
                        onChange={(e) => updateSection(s.id, { content: e.target.value })}
                        style={{ width: "95%", height: 100, padding: 8, fontFamily: "inherit" }}
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
                            value={safeColor(s.color || DEFAULT_CTA_COLOR)}
                            onChange={(e) => updateSection(s.id, { color: e.target.value })}
                            aria-label="CTA colour"
                          />
                          <input
                            className="input"
                            type="text"
                            value={safeColor(s.color || DEFAULT_CTA_COLOR)}
                            onChange={(e) => updateSection(s.id, { color: e.target.value.trim() })}
                            placeholder="#667eea"
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
              <button className="btn export" onClick={exportJSON}>⬇ Export JSON</button>
            </div>

          </div>
        </div>

        {/* Right panel: Live preview */}
        <div className="preview">
          <div className="title">Live Preview</div>
          <iframe title="preview" style={{ width: "100%", height: "150vh", border: "none" }} srcDoc={html} />
        </div>
      </div>

      {/* Modal for raw HTML */}
      {showHtmlModal && (
        <div className="modal-backdrop" onClick={() => setShowHtmlModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <strong>HTML</strong>
              <button className="btn remove" onClick={() => setShowHtmlModal(false)}>✕ Close</button>
            </div>
            <div className="modal-body">
              <textarea readOnly value={exportedHtml} />
            </div>
            <div className="actions">
              <button className="btn info" onClick={copyHtmlToClipboard}>Copy to clipboard</button>
              <button className="btn info" onClick={downloadHtmlFile}>Download HTML</button>
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
        <input
          type="text"
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "95%", padding: 8 }}
        />
        {value && (
          <button
            type="button"
            onClick={clearField}
            className="clear-link"
          >
            Clear
          </button>
        )}
      </div>
      {max ? (
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          Max {max} characters
        </div>
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
