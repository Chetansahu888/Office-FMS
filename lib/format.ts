// Shared display helpers for Apps Script (Google Sheet) data.

const pad = (n: number) => n.toString().padStart(2, '0');

export type DateOrder = 'MDY' | 'DMY';

/**
 * Parse a date value coming from the Apps Script backend.
 * The Store backend sends "MM/dd/yyyy HH:mm:ss" (order 'MDY'); the indent
 * history backend sends "dd/MM/yyyy HH:mm:ss" (order 'DMY'). ISO strings,
 * epoch numbers and Date objects are also accepted.
 */
export function parseSheetDate(value: unknown, order: DateOrder = 'MDY'): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(value).trim();
  if (!str) return null;

  // MM/dd/yyyy or dd/MM/yyyy [HH:mm[:ss]]
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [, a, b, yyyy, hh = '0', mi = '0', ss = '0'] = m;
    let [mm, dd] = order === 'MDY' ? [a, b] : [b, a];
    // Some rows are stored in the other order (e.g. "23/09/2026"); swap when the month is impossible
    if (+mm > 12 && +dd <= 12) [mm, dd] = [dd, mm];
    const d = new Date(+yyyy, +mm - 1, +dd, +hh, +mi, +ss);
    // Reject impossible dates (e.g. a dd/MM value like 23/04) instead of rolling over
    if (isNaN(d.getTime()) || d.getMonth() !== +mm - 1 || d.getDate() !== +dd) return null;
    return d;
  }

  // ISO / anything else the browser understands
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a sheet date as "M/d/yyyy HH:mm:ss" (e.g. "9/23/2026 12:19:37").
 * Returns the fallback for empty values and the raw text if it cannot be parsed.
 */
export function formatDate(value: unknown, order: DateOrder = 'MDY', fallback = '-'): string {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const d = parseSheetDate(value, order);
  if (!d) return String(value);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Column names that hold dates in the FMS sheet. */
export function isDateField(key: string): boolean {
  return /^(Timestamp|Planned\d*|Actual\d*)$/.test(key);
}

/** Extract a Google Drive file id from any common Drive URL form. */
export function getDriveFileId(url: string): string | null {
  if (!url) return null;
  const byPath = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (byPath) return byPath[1];
  const byQuery = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (byQuery && /drive\.google\.com|docs\.google\.com/.test(url)) return byQuery[1];
  return null;
}

/** URL that renders the file inline (embeddable) instead of downloading it. */
export function getPreviewUrl(url: string): string {
  const id = getDriveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : url;
}

/** URL that opens the file in Drive's viewer in a new tab. */
export function getViewUrl(url: string): string {
  const id = getDriveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/view` : url;
}

/** True only when the approval column ("What") says Approved. */
export function isApproved(row: { What?: unknown; [key: string]: any }): boolean {
  return String(row?.What ?? '').trim().toLowerCase() === 'approved';
}
