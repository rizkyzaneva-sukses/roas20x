import * as XLSX from "xlsx";

export function parseWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(Buffer.from(buffer), { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
}

export function normalizeName(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function csvTemplate(headers: string[]) {
  return headers.join(",") + "\n";
}
