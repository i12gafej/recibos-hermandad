import type ExcelJS from "exceljs";

export type RawRow = Record<string, string>;

function normalizeKey(value: string) {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function cellValueToText(cell: ExcelJS.Cell): string {
  const v: any = cell.value;
  if (v == null) return "";

  // Formula: { formula, result }
  if (typeof v === "object" && v.formula != null) {
    return v.result == null ? "" : String(v.result).trim();
  }

  // Hyperlink / text: { text, hyperlink }
  if (typeof v === "object" && typeof v.text === "string") {
    return v.text.trim();
  }

  // RichText: { richText: [{ text: "..." }, ...] }
  if (typeof v === "object" && Array.isArray(v.richText)) {
    return v.richText.map((p: any) => p.text ?? "").join("").trim();
  }

  // Date
  if (v instanceof Date) return v.toISOString();

  return String(v).trim();
}

export async function readXlsx(file: File, requiredHeaders: string[] = []) {
  const [{ Workbook }] = await Promise.all([import("exceljs")]);
  const data = await file.arrayBuffer();

  const workbook = new Workbook();
  await workbook.xlsx.load(data);

  const requiredNormalized = requiredHeaders.map(normalizeKey);

  // Elige hoja: primera que contenga headers requeridos (si hay)
  const sheets = workbook.worksheets;
  if (sheets.length === 0) return [];

  let worksheet = sheets[0];

  if (requiredNormalized.length > 0) {
    const candidate = sheets.find((ws) => {
      let found = false;
      ws.eachRow({ includeEmpty: true }, (row) => {
        if (found) return;
        const rowTexts: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          rowTexts.push(cellValueToText(cell));
        });
        const normalized = rowTexts.map(normalizeKey);
        if (requiredNormalized.every((r) => normalized.includes(r))) found = true;
      });
      return found;
    });
    if (candidate) worksheet = candidate;
  }

  // Detectar cabecera
  let headerRowIndex: number | null = null;

  if (requiredNormalized.length > 0) {
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (headerRowIndex != null) return;

      // construir por columna real
      const rowTexts: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        rowTexts[cell.col - 1] = cellValueToText(cell);
      });

      const normalized = rowTexts.map((t) => normalizeKey(t ?? ""));
      const hasAll = requiredNormalized.every((r) => normalized.includes(r));
      if (hasAll) headerRowIndex = rowNumber;
    });
  } else {
    headerRowIndex = 1;
  }

  if (headerRowIndex == null) return [];

  const headerRow = worksheet.getRow(headerRowIndex);

  // Map: colNumber -> headerText
  const headerByCol = new Map<number, string>();
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    const header = cellValueToText(cell);
    if (header) headerByCol.set(cell.col, header);
  });

  const rows: RawRow[] = [];

  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber <= headerRowIndex!) return;

    const cleaned: RawRow = {};

    for (const [col, header] of headerByCol.entries()) {
      const text = cellValueToText(row.getCell(col));
      cleaned[header] = text;
    }

    // descarta filas totalmente vacías
    const hasAny = Object.values(cleaned).some((v) => v !== "");
    if (hasAny) rows.push(cleaned);
  });

  return rows;
}
