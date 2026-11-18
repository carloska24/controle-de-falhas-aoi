function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  // Texto com início interpretável como fórmula deve permanecer texto.
  if (/^[\s\u0000-\u001f]*[=+\-@＝＋－＠]/u.test(text) || /^[\t\r\n\u0000]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function serializeCSV<T>(records: T[], columns: [string, (row: T) => unknown][]): string {
  const header = columns.map(([label]) => csvCell(label)).join(',');
  const rows = records.map(row => columns.map(([, accessor]) => csvCell(accessor(row))).join(','));
  return '\ufeff' + [header, ...rows].join('\r\n') + '\r\n';
}
