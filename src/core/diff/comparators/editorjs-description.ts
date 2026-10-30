/**
 * Normalizes rich-text descriptions for comparison.
 *
 * Descriptions are stored by Saleor as EditorJS JSON, while config files may hold either that
 * JSON (from introspect) or plain text (wrapped into a single paragraph on deploy). Comparing
 * the raw strings would flag noise such as `time`/`id`/`version`, so descriptions are compared
 * by their visible text. When both sides are EditorJS documents, block types are compared too,
 * so turning a paragraph into a header or list is detected.
 */

type EditorJsBlock = { type?: unknown; data?: Record<string, unknown> } | null | undefined;

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const stripTags = (s: string) => s.replace(/<[^>]*>/g, "");

const normalizeText = (s: string) => stripTags(decodeEntities(s)).replace(/\s+/g, " ").trim();

/** Collects text from strings, nested arrays (tables) and nested list items (`{ content, items }`) */
function collectText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (value && typeof value === "object") {
    const item = value as { content?: unknown; items?: unknown };
    return [...collectText(item.content), ...collectText(item.items)];
  }
  return [];
}

const TEXT_FIELDS = ["text", "items", "content", "caption", "code"] as const;

function blockText(block: EditorJsBlock): string {
  const data = block?.data ?? {};
  return normalizeText(TEXT_FIELDS.flatMap((field) => collectText(data[field])).join(" "));
}

function parseEditorJsBlocks(raw: string): EditorJsBlock[] | undefined {
  try {
    const json = JSON.parse(raw);
    return json && Array.isArray(json.blocks) ? json.blocks : undefined;
  } catch {
    return undefined;
  }
}

interface NormalizedDescription {
  /** Visible text of the whole description */
  readonly text: string;
  /** Block type and text per block, when the description is an EditorJS document */
  readonly blocks?: readonly string[];
}

export function normalizeDescription(value: unknown): NormalizedDescription | undefined {
  if (!value || typeof value !== "string") return undefined;
  const raw = value.trim();
  const blocks = parseEditorJsBlocks(raw);

  if (!blocks) {
    return { text: normalizeText(raw) };
  }

  const nonEmpty = blocks
    .map((block) => ({ type: String(block?.type ?? ""), text: blockText(block) }))
    .filter((block) => block.text.length > 0 || block.type !== "paragraph");

  return {
    text: nonEmpty
      .map((block) => block.text)
      .filter(Boolean)
      .join(" "),
    blocks: nonEmpty.map((block) => `${block.type}:${block.text}`),
  };
}

/** Returns true when two descriptions have the same visible content */
export function descriptionsEqual(local: unknown, remote: unknown): boolean {
  const l = normalizeDescription(local);
  const r = normalizeDescription(remote);

  if ((l?.text ?? "") !== (r?.text ?? "")) return false;
  // Plain text vs EditorJS: only visible text can be compared
  if (!l?.blocks || !r?.blocks) return true;
  return l.blocks.length === r.blocks.length && l.blocks.every((b, i) => b === r.blocks?.[i]);
}
