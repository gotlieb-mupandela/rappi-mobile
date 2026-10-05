export type StockAdjustableLine = {
  code: string;
  size: string;
  qty: number;
  name: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The checkout API's 400 text is free-form. Only a line whose code or full name appears is changed.
export function linesAfterStockError<T extends StockAdjustableLine>(lines: T[], message: string): T[] {
  const gone = /no longer (sold|available)|not found|unavailable/i.test(message);
  const onlyMatch = message.match(/only\s+(\d+)/i);
  if (!gone && !onlyMatch) return lines;

  const mentioned = lines.filter(
    (line) =>
      new RegExp(`(^|[^\\w.])${escapeRegExp(line.code)}($|[^\\w.])`).test(message) ||
      (line.name.length > 3 && message.toLowerCase().includes(line.name.toLowerCase())),
  );
  if (mentioned.length === 0) return lines;

  const sized = mentioned.filter((line) =>
    new RegExp(`(^|[^\\w-])${escapeRegExp(line.size)}($|[^\\w-])`).test(
      message.replace(line.code, '').replace(line.name, ''),
    ),
  );
  const targets = new Set((sized.length > 0 ? sized : mentioned).map((line) => `${line.code}|${line.size}`));

  return lines
    .map((line) => {
      if (!targets.has(`${line.code}|${line.size}`)) return line;
      if (gone) return { ...line, qty: 0 };
      return { ...line, qty: Math.min(line.qty, Number(onlyMatch?.[1] ?? 0)) };
    })
    .filter((line) => line.qty > 0);
}
