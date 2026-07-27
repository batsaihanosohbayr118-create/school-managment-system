/**
 * Helpers for projecting a `ResourceTable` into typed objects.
 *
 * Columns are resolved by name, never by index, so reordering
 * `resourceColumns` in lib/school-db.ts cannot silently corrupt a mobile
 * response — it throws instead.
 *
 * Every table value is a string (`rowToArray` maps everything through
 * `stringValue`), so the parsers below all return null rather than NaN when the
 * source is free text.
 */
export function columnIndex(columns: string[], name: string): number {
  const index = columns.findIndex((column) => column.toLowerCase() === name.toLowerCase());
  if (index < 0) {
    throw new Error(`Column "${name}" is missing. Available: ${columns.join(", ")}`);
  }
  return index;
}

export function parseScore(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseMoney(value: string): number | null {
  const digits = value.replace(/[^0-9.-]/g, "");
  if (!digits) return null;

  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseTimeRange(value: string): { startsAt: string | null; endsAt: string | null } {
  const match = value.match(/^\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*$/);
  if (!match) return { startsAt: null, endsAt: null };

  return { startsAt: match[1], endsAt: match[2] };
}
