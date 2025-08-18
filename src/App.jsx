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
/* The dynamic body lives in the single fenced block: SECTIONS */
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
    <!-- editable:start name="snippet_text" label="Snippet Text" type="text" max="80" -->
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
                  <!-- editable:start name="SIGNOFF_NAME" label="Sign-off Name" type="text" max="120" -->
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
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
const sectionHTML = {
  paragraph: (html) =>
    `<p style="margin:0 0 24px 0; color:rgb(71, 85, 105)">${html}</p>`,
  cta: (label, href) => `
<table cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td align="center" style="padding:8px 0 24px 0">
      <a class="btn" href="${href}" style="background:rgb(102, 126, 234); border-radius:6px; color:#fff; display:inline-block; font-weight:700; font-size:16px; line-height:44px; text-align:center; text-decoration:none; width:400px">
        ${escapeText(label)}
      </a>
    </td>
  </tr>
</table>`.trim(),
};

/* ===================== Main App ===================== */
export default function App() {
  const [brand, setBrand] = useState("myclub"); // 'myclub' | 'decathlon'
  const [html, setHtml] = useState(baseTemplate);

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
          return sectionHTML.cta(label, href);
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
      },
    ]);

  const removeSection = (id) =>
    setSections((s) => s.filter((x) => x.id !== id));

  const updateSection = (id, patch) =>
    setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const exportHtml = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-${brand}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "500px 1fr", gap: 16, padding: 16 }}>
      <div style={{ minWidth: 340 }}>
        <h2 style={{ marginTop: 0 }}>Email Editor</h2>

        {/* Brand */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
            Brand
          </label>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="myclub">My Club</option>
            <option value="decathlon">Decathlon Club</option>
          </select>
          <small style={{ color: "#555" }}>Automatically fills HEADER and FOOTER.</small>
        </div>

        {/* Fixed fields */}
        <FieldText
          label="Snippet Text"
          name="snippet_text"
          value={getBlockValue("snippet_text").replace(/\n/g, " ").trim()}
          onChange={(v) => handleFenceChange("snippet_text", v, "text")}
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
          name="SIGNOFF_NAME"
          value={getBlockValue("SIGNOFF_NAME").replace(/\n/g, " ").trim()}
          onChange={(v) => handleFenceChange("SIGNOFF_NAME", v, "text")}
          max={120}
        />

        {/* Dynamic body sections */}
        <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 700 }}>
          Body Sections (drag to reorder)
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={addParagraph}>+ Add Paragraph</button>
          <button onClick={addCTA}>+ Add CTA</button>
        </div>

        <div>
          {sections.map((s) => (
            <div
              key={s.id}
              draggable
              onDragStart={onDragStart(s.id)}
              onDragOver={onDragOver(s.id)}
              onDrop={onDrop(s.id)}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 10,
                marginBottom: 10,
                background: "#fff",
              }}
              title="Drag to reorder"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong>{s.type === "paragraph" ? "Paragraph" : "CTA Button"}</strong>
                <button onClick={() => removeSection(s.id)} title="Remove">− Remove</button>
              </div>

              {s.type === "paragraph" ? (
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4 }}>
                    Paragraph text (allows: &lt;a&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;br /&gt;)
                  </label>
                  <textarea
                    value={s.content}
                    rows={3}
                    onChange={(e) => updateSection(s.id, { content: e.target.value })}
                    style={{ width: "100%", padding: 8, fontFamily: "inherit" }}
                  />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4 }}>Button text</label>
                    <input
                      type="text"
                      value={s.label}
                      onChange={(e) => updateSection(s.id, { label: e.target.value })}
                      style={{ width: "100%", padding: 8 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4 }}>Button URL</label>
                    <input
                      type="text"
                      value={s.href}
                      onChange={(e) => updateSection(s.id, { href: e.target.value })}
                      style={{ width: "100%", padding: 8 }}
                      placeholder="https://…"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={exportHtml} style={{ marginTop: 8, padding: "10px 12px" }}>
          Export HTML
        </button>
      </div>

      {/* Preview */}
      <div style={{ border: "1px solid #ddd", background: "#fff" }}>
        <div style={{ padding: 8, borderBottom: "1px solid #eee", fontSize: 12, color: "#555" }}>
          Live Preview
        </div>
        <iframe
          title="preview"
          style={{ width: "80%", height: "90vh", border: "none" }}
          srcDoc={html}
        />
      </div>
    </div>
  );
}

/* ===================== Small components & utils ===================== */
function FieldText({ label, name, value, onChange, max }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
        {label} <small style={{ color: "#666" }}>({name})</small>
      </label>
      <input
        type="text"
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />
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
