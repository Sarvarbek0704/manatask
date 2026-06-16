/** URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48)
    .replace(/^-|-$/g, '');
}

/** Default status columns seeded into every new project. */
export function defaultStatuses() {
  return [
    { name: 'Backlog', category: 'backlog', color: '#94a3b8', order: 0 },
    { name: 'To Do', category: 'todo', color: '#64748b', order: 1 },
    { name: 'In Progress', category: 'in_progress', color: '#3b82f6', order: 2 },
    { name: 'In Review', category: 'in_progress', color: '#a855f7', order: 3 },
    { name: 'Done', category: 'done', color: '#22c55e', order: 4 },
  ];
}

/** Order key for inserting at the end of a column. */
export const ORDER_STEP = 1000;

/**
 * Extracts mentioned user ids from a comment body. The frontend emits mentions
 * as `@[Display Name](<uuid>)`; returns the unique uuids.
 */
export function parseMentions(body: string): string[] {
  const re = /@\[[^\]]+\]\(([0-9a-fA-F-]{36})\)/g;
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) ids.add(m[1]);
  return [...ids];
}

/**
 * Defense-in-depth sanitizer for user-supplied rich text (descriptions,
 * comments). Strips script/style/iframe blocks, inline event handlers and
 * javascript: URIs. The frontend should still render via a vetted sanitizer.
 */
export function sanitizeRichText(input: string | null | undefined): string | null {
  if (input == null) return input ?? null;
  return input
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}
