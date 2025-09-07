// Internal fence regex used to find editable regions
const FENCE_RE = /<!--\s*editable:start([\s\S]*?)-->([\s\S]*?)<!--\s*editable:end\s*-->/g;

export interface EditableBlock {
  name: string;
  label: string;
  type: string;
  max?: number;
  fullMatch: string;
  start: number;
  end: number;
  body: string;
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const rx = /(\w+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(raw))) out[m[1]] = m[2];
  return out;
}

/**
 * Extracts all editable blocks from a given HTML string.
 */
export function getBlocks(html: string): EditableBlock[] {
  const blocks: EditableBlock[] = [];
  let m: RegExpExecArray | null;
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

/**
 * Replaces an editable block in an HTML string with new content.
 */
export function replaceBlock(html: string, name: string, newBody: string): string {
  const re = new RegExp(
    `<!--\\s*editable:start([^>]*name="${name}"[^>]*)-->([\\s\\S]*?)<!--\\s*editable:end\\s*-->`,
    "m",
  );
  return html.replace(re, (_all, attrs: string) => {
    return `<!-- editable:start${attrs}-->${newBody}<!-- editable:end -->`;
  });
}

export default { getBlocks, replaceBlock };
