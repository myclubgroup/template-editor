// Locked-Section HTML Editor (with Brand Switcher)
// Accepts an HTML template and only allows edits inside commented regions.
// New: a brand switcher that auto-fills HEADER and FOOTER with
// My Club vs Decathlon Club variants.
//
// In your email HTML, fence the two places like this:
//
//   <!-- editable:start name="HEADER" label="HEADER" type="rich"
//        allowed="table,tbody,tr,td,img,a,br,strong,em,span,p" -->
//   (will be auto-filled by brand)
//   <!-- editable:end -->
//
//   <!-- editable:start name="FOOTER" label="FOOTER" type="rich"
//        allowed="a,br,strong,em,span,p" -->
//   (will be auto-filled by brand)
//   <!-- editable:end -->

import React, { useEffect, useMemo, useRef, useState } from "react";

// Example minimal template (you will paste your full email template in the UI)
const exampleTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Example Email</title>
  </head>
  <body style="margin:0;background:#f8fafc;font-family:Arial, Helvetica, sans-serif;font-size:14px;">
    <table width="100%" cellPadding="0" cellSpacing="0" style="background:#f8fafc"><tr><td align="center" style="padding:20px 0">
      <table width="600" class="container" style="width:600px;background:#ffffff;border-collapse:collapse;">
        <tr>
          <!-- editable:start name="HEADER" label="HEADER" type="rich" allowed="table,tbody,tr,td,img,a,br,strong,em,span,p" -->
          <td align="center" style="padding:24px 32px;background:linear-gradient(135deg, rgb(102,126,234) 0%, rgb(10,26,54) 100%);color:#fff;">Default header (brand will replace)</td>
          <!-- editable:end -->
        </tr>
        <tr>
          <td style="padding:32px;color:#334155;line-height:1.5">
            <h1 style="margin:0 0 16px 0;color:#1e293b;font-size:18px;">Dear Customer,</h1>
            <p style="margin:0 0 16px 0;color:#475569">Body content here…</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0">
            <p style="margin:0;font-size:10px;line-height:1.5;color:#64748b">
              <!-- editable:start name="FOOTER" label="FOOTER" type="rich" allowed="a,br,strong,em,span,p" -->
              Default footer (brand will replace)
              <!-- editable:end -->
            </p>
          </td>
        </tr>
      </table>
    </td></tr></table>
  </body>
</html>`;

// Your provided brand snippets
const BRAND_SNIPPETS = {
  myclub: {
    HEADER: `<td align="center" style="padding:24px 32px; background:linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(10, 26, 54) 100%)"><img imgfilesize="4054" src="https://crm.zoho.eu/crm/viewInLineImage?fileContent=87972724af3582006b7c3e3104ee518703294fe114a5e654eb29439fef7fc12cc01bab2f9f213296ef943d3f42bf43616df27d9b85c54301cb3b6609123d80015d46c3cf8effbaae6690a928863d40363301ab2b56949a4b27fcacb6e6050574" align="middle"></td>`,
    FOOTER: `My Club Group and Decathlon My Club are trading names of My Club Europe PLC, registered in England &amp; Wales with company number 12087282. Registered office: 2 Oxted Chambers, 185-187 Station Road East, Oxted RH8 0QE.<br>Decathlon is a registered trade mark of Decathlon SA and used under licence.`,
  },
  decathlonclub: {
    HEADER: `<td align="center" style="padding:24px 32px; background:linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(54, 67, 186) 100%)"><img imgfilesize="4222" src="https://crm.zoho.eu/crm/viewInLineImage?fileContent=16dd9ff341b5533854c3c0f4fb18f4f7fd77b29599b48e692b77e733cb65641f7c8549da1a3ea44ef2bd8b0c94186ed834a3ab3fd06e6c080b46f360737c67145053c285b5e16acc216ffdad9a8ef078140066b38edfd8339335623786c7a561" align="middle"></td>`,
    FOOTER: `Decathlon My Club and My Club Group are trading names of My Club Europe PLC, registered in England &amp; Wales with company number 12087282. Registered office: 2 Oxted Chambers, 185-187 Station Road East, Oxted RH8 0QE.<br>Decathlon is a registered trade mark of Decathlon SA and used under licence.`,
  }
};

// ————— Utilities to parse and sanitize editable regions —————
const START_RX = /<!--\s*editable:start([\s\S]*?)-->/gi;
const END_RX = /<!--\s*editable:end\s*-->/gi;

function parseAttrs(raw = "") {
  const out = {};
  const rx = /(\w+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = rx.exec(raw))) out[m[1]] = m[2];
  return out;
}

function splitBlocks(template) {
  const blocks = [];
  const errors = [];
  let cursor = 0;

  while (true) {
    START_RX.lastIndex = cursor;
    const start = START_RX.exec(template);
    if (!start) break;

    const startIdx = start.index;
    const startEndIdx = START_RX.lastIndex;
    const attrs = parseAttrs(start[1] || "");

    END_RX.lastIndex = startEndIdx;
    const end = END_RX.exec(template);
    if (!end) {
      errors.push(`Missing <!-- editable:end --> for block starting @${startIdx}`);
      break;
    }

    const endIdx = end.index;
    const endEndIdx = END_RX.lastIndex;

    const inner = template.slice(startEndIdx, endIdx).trim();
    if (!attrs.name) attrs.name = `block_${blocks.length + 1}`;

    const defaultAllowed = ["table","tbody","tr","td","img","a","br","strong","em","span","p"];

    blocks.push({
      name: attrs.name,
      label: attrs.label || attrs.name,
      type: attrs.type || (attrs.name === "HEADER" || attrs.name === "FOOTER" ? "rich" : "text"),
      allowed: (attrs.allowed ? attrs.allowed.split(",") : (attrs.type === "rich" || attrs.name === "HEADER" || attrs.name === "FOOTER" ? defaultAllowed : []))
        .map(s => s.trim()).filter(Boolean),
      max: attrs.max ? parseInt(attrs.max, 10) : undefined,
      options: attrs.options ? attrs.options.split("|").map(s=>s.trim()) : undefined,
      startIdx, startEndIdx, endIdx, endEndIdx,
      original: inner,
    });

    cursor = endEndIdx;
  }

  return { blocks, errors };
}

function sanitizeHtml(html, allowedTags = []) {
  // If no tags allowed, return escaped text (preserve line breaks)
  if (!allowedTags || allowedTags.length === 0) {
    const txt = html.replace(/\r/g, "").replace(/\n/g, "\n");
    const esc = txt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return esc.replace(/\n/g, "<br>");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const isAllowed = tag => allowedTags.includes(tag.toLowerCase());

  // Attribute allowlist per tag (email-safe subset)
  const ATTRS = {
    global: new Set(["style", "align", "class"]),
    a: new Set(["href", "title", "name", "target"]),
    img: new Set(["src", "alt", "width", "height", "style", "align"]),
    table: new Set(["border", "cellpadding", "cellspacing", "width", "align", "style"]),
    td: new Set(["colspan", "rowspan", "width", "align", "valign", "style"]),
    tr: new Set(["align", "valign", "style"]),
  };

  const cleanAttrs = (el) => {
    const tag = el.tagName.toLowerCase();
    const allowedForTag = new Set([...(ATTRS.global || []), ...(ATTRS[tag] || [])]);

    const attrs = Array.from(el.attributes);
    for (const a of attrs) {
      const name = a.name.toLowerCase();
      if (!allowedForTag.has(name)) {
        el.removeAttribute(a.name);
        continue;
      }
      if (tag === "a" && name === "href") {
        const href = a.value.trim();
        const ok = /^(https?:|mailto:|tel:|#)/i.test(href);
        if (!ok) el.removeAttribute(a.name);
      }
      if (tag === "img" && name === "src") {
        const src = a.value.trim();
        const ok = /^(https?:|data:)/i.test(src) || src.startsWith("/");
        if (!ok) el.removeAttribute(a.name);
      }
    }
  };

  const walk = (node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        if (!isAllowed(tag)) {
          const text = doc.createTextNode(child.textContent || "");
          child.replaceWith(text);
        } else {
          cleanAttrs(child);
          walk(child);
        }
      } else if (child.nodeType === 3) {
        // text OK
      } else {
        child.remove();
      }
    }
  };

  walk(doc.body);
  return doc.body.innerHTML.replace(/^<div>|<\/div>$/g, "");
}

function download(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function ToolbarButton({ onClick, children, title }) {
  return (
    <button type="button" onClick={onClick} title={title} className="px-2 py-1 rounded-lg border text-sm hover:bg-gray-50">{children}</button>
  );
}

function RichEditor({ value, onChange, max, allowed }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const exec = (cmd, arg) => {
    document.execCommand(cmd, false, arg);
    ref.current && onChange(ref.current.innerHTML);
  };

  const handleInput = () => {
    if (!ref.current) return;
    if (max) {
      const textLen = ref.current.innerText.length;
      if (textLen > max) {
        const trimmed = ref.current.innerText.slice(0, max);
        ref.current.innerHTML = sanitizeHtml(trimmed, []);
      }
    }
    onChange(ref.current.innerHTML);
  };

  const applyLink = () => {
    const href = prompt("Enter URL (https://…)");
    if (!href) return;
    exec("createLink", href);
  };

  const cleanNow = () => {
    if (!ref.current) return;
    ref.current.innerHTML = sanitizeHtml(ref.current.innerHTML, allowed);
    onChange(ref.current.innerHTML);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <ToolbarButton onClick={() => exec("bold")}>B</ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")}>I</ToolbarButton>
        <ToolbarButton onClick={applyLink}>Link</ToolbarButton>
        <ToolbarButton onClick={() => exec("unlink")}>Unlink</ToolbarButton>
        <ToolbarButton onClick={cleanNow} title="Sanitize HTML">Sanitize</ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[120px] w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        onInput={handleInput}
      />
      {max && (<div className="text-xs text-gray-500">Max ~{max} characters</div>)}
    </div>
  );
}

export default function App() {
  const [template, setTemplate] = useState(exampleTemplate);
  const [blocks, setBlocks] = useState([]);
  const [errors, setErrors] = useState([]);
  const [values, setValues] = useState({});
  const [showTemplateInput, setShowTemplateInput] = useState(false);

  // brand: 'myclub' | 'decathlonclub'
  const [brand, setBrand] = useState('myclub');
  const [autoApplyBrand, setAutoApplyBrand] = useState(true);

  // Parse template when it changes
  useEffect(() => {
    const { blocks: parsed, errors: e } = splitBlocks(template);
    setBlocks(parsed);
    setErrors(e);
    const init = {};
    for (const b of parsed) init[b.name] = b.original;
    setValues(init);
  }, [template]);

  // Apply brand to HEADER/FOOTER when brand changes or blocks appear
  useEffect(() => {
    if (!autoApplyBrand) return;
    const presets = BRAND_SNIPPETS[brand];
    if (!presets || blocks.length === 0) return;
    setValues(v => ({
      ...v,
      ...(v.HEADER !== undefined ? { HEADER: presets.HEADER } : {}),
      ...(v.FOOTER !== undefined ? { FOOTER: presets.FOOTER } : {}),
    }));
  }, [brand, blocks, autoApplyBrand]);

  const updateValue = (name, val) => setValues(v => ({ ...v, [name]: val }));

  const generateOutput = () => {
    if (!blocks.length) return template;
    let out = "";
    let pos = 0;
    for (const b of blocks) {
      out += template.slice(pos, b.startEndIdx);
      const val = values[b.name] ?? b.original;
      const allowedTags = (b.type === "rich")
        ? (b.allowed && b.allowed.length ? b.allowed : ["table","tbody","tr","td","img","a","br","strong","em","span","p"])
        : [];
      const safe = sanitizeHtml(val, allowedTags);
      out += `\n${safe}\n`;
      pos = b.endIdx;
    }
    out += template.slice(pos);
    return out;
  };

  const outputHtml = useMemo(() => generateOutput(), [template, values, blocks]);

  const importJson = async (file) => {
    const text = await file.text();
    try {
      const obj = JSON.parse(text);
      setValues(v => ({ ...v, ...obj }));
    } catch {
      alert("Invalid JSON");
    }
  };

  const applyBrandNow = () => {
    const presets = BRAND_SNIPPETS[brand];
    if (!presets) return;
    setValues(v => ({
      ...v,
      ...(v.HEADER !== undefined ? { HEADER: presets.HEADER } : {}),
      ...(v.FOOTER !== undefined ? { FOOTER: presets.FOOTER } : {}),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Locked-Section HTML Editor</h1>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Brand switcher */}
            <label className="text-sm text-gray-700">Brand</label>
            <select
              className="px-3 py-2 rounded-xl border"
              value={brand}
              onChange={(e)=>setBrand(e.target.value)}
              title="Choose brand presets for HEADER/FOOTER"
            >
              <option value="myclub">My Club</option>
              <option value="decathlonclub">Decathlon Club</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={autoApplyBrand} onChange={(e)=>setAutoApplyBrand(e.target.checked)} />
              Auto-apply to HEADER/FOOTER
            </label>
            <button className="px-3 py-2 rounded-xl border hover:bg-gray-50" onClick={applyBrandNow}>Apply Now</button>
            <button className="px-3 py-2 rounded-xl border hover:bg-gray-50" onClick={() => setShowTemplateInput(v=>!v)}>
              {showTemplateInput ? "Hide" : "Load Template"}
            </button>
            <button className="px-3 py-2 rounded-xl border hover:bg-gray-50"
              onClick={() => download("output.html", outputHtml, "text/html;charset=utf-8")}>
              Download HTML
            </button>
            <button className="px-3 py-2 rounded-xl border hover:bg-gray-50"
              onClick={() => download("values.json", JSON.stringify(values, null, 2))}>
              Export JSON
            </button>
          </div>
        </div>
      </header>

      {showTemplateInput && (
        <section className="max-w-6xl mx-auto px-4 mt-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="font-medium">Paste your HTML template</h2>
              <div className="flex gap-2">
                <button className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                        onClick={() => setTemplate(exampleTemplate)}>
                  Use example template
                </button>
                <label className="px-3 py-2 rounded-xl border hover:bg-gray-50 cursor-pointer">
                  <input type="file" accept=".html,.htm,.txt" className="hidden"
                         onChange={(e)=>{ const f = e.target.files?.[0]; if (f) f.text().then(setTemplate); }} />
                  Upload .html
                </label>
              </div>
            </div>
            <textarea className="w-full h-60 font-mono text-sm rounded-xl border p-3"
                      value={template} onChange={e=>setTemplate(e.target.value)} />
            {errors.length > 0 && (
              <ul className="mt-3 text-sm text-red-600 list-disc pl-6">
                {errors.map((er, i) => <li key={i}>{er}</li>)}
              </ul>
            )}
          </div>
        </section>
      )}

      <main className="max-w-6xl mx-auto p-4 grid md:grid-cols-2 gap-4">
        <section className="space-y-3">
          {blocks.length === 0 && (
            <div className="rounded-2xl border bg-white p-6 text-gray-600">
              No editable regions found. Add fences like:
              <pre className="mt-3 bg-gray-50 p-3 rounded-lg text-xs overflow-auto">{`<!-- editable:start name="HEADER" label="HEADER" type="rich" allowed="table,tbody,tr,td,img,a,br,strong,em,span,p" -->\n...\n<!-- editable:end -->`}</pre>
            </div>
          )}

          {blocks.map((b) => (
            <div key={b.name} className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-semibold">{b.label}</h3>
                <span className="text-xs text-gray-500">type: {b.type}</span>
              </div>

              {b.type === "text" && (
                <input
                  type="text"
                  className="w-full rounded-xl border p-3"
                  value={stripHtml(values[b.name] ?? "")}
                  maxLength={b.max}
                  onChange={(e)=> updateValue(b.name, sanitizeHtml(e.target.value, []))}
                />
              )}

              {b.type === "textarea" && (
                <textarea
                  className="w-full min-h-[120px] rounded-xl border p-3"
                  value={unescapeHtml(stripHtml(values[b.name] ?? "").replaceAll("<br>", "\n"))}
                  maxLength={b.max}
                  onChange={(e)=> updateValue(b.name, sanitizeHtml(e.target.value, []))}
                />
              )}

              {b.type === "rich" && (
                <RichEditor
                  value={values[b.name] ?? ""}
                  onChange={(html)=> updateValue(b.name, html)}
                  max={b.max}
                  allowed={b.allowed}
                />
              )}

              {b.type === "image" && (
                <input
                  type="url"
                  placeholder="https://…"
                  className="w-full rounded-xl border p-3"
                  value={stripHtml(values[b.name] ?? "")}
                  onChange={(e)=> updateValue(b.name, sanitizeHtml(e.target.value, []))}
                />
              )}

              {b.type === "select" && Array.isArray(b.options) && (
                <select
                  className="w-full rounded-xl border p-3"
                  value={stripHtml(values[b.name] ?? (b.options[0] || ""))}
                  onChange={(e)=> updateValue(b.name, sanitizeHtml(e.target.value, []))}
                >
                  {b.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
            </div>
          ))}

          {blocks.length > 0 && (
            <div className="rounded-2xl border bg-white p-4 flex flex-wrap gap-2">
              <label className="px-3 py-2 rounded-xl border hover:bg-gray-50 cursor-pointer">
                <input type="file" accept="application/json" className="hidden"
                       onChange={(e)=>{ const f = e.target.files?.[0]; if (f) importJson(f); }} />
                Import JSON Values
              </label>
              <button className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                      onClick={()=> setValues(Object.fromEntries(blocks.map(b=>[b.name,b.original])))} >
                Reset to Template Defaults
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white overflow-hidden">
          <div className="border-b px-4 py-2 text-sm text-gray-600">Live preview</div>
          <iframe title="Preview" className="w-full h-[70vh]" srcDoc={outputHtml} />
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-gray-500">
        <p className="mt-6">
          Tip: Ensure your HEADER/FOOTER fences are <code>type="rich"</code> and include an
          <code> allowed</code> list that covers email-safe tags (e.g. <code>table,tbody,tr,td,img,a,br,strong,em,span,p</code>).
        </p>
      </footer>
    </div>
  );
}

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || tmp.innerText || "";
}

function unescapeHtml(str) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}