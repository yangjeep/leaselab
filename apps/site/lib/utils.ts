export function slugify(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function parseBoolish(v: any): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (['y','yes','true','1'].includes(s)) return true;
  if (['n','no','false','0'].includes(s)) return false;
  return undefined;
}

export function splitCSV(v: any): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  return s.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
}
