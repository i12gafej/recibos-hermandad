import type { RawRow } from "../xlsx/service";

export type TemplateRow = {
  nombre: string;
  domicilio: string;
  numero: string;
  letra: string;
  telefono: string;
  recibo: string;
  estado: string;
};

const REQUIRED_COLUMNS = [
  "herman@",
  "domicilio",
  "numero",
  "letra",
  "telefono",
  "recibo",
  "estado"
];

export const REQUIRED_COLUMNS_LABELS = [
  "Herman@",
  "Domicilio",
  "Numero",
  "Letra",
  "Telefono",
  "Recibo",
  "Estado"
];

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function mapRows(rows: RawRow[]) {
  const headers = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => headers.add(normalizeKey(key)));
  });

  const missingColumns = REQUIRED_COLUMNS_LABELS.filter(
    (_, index) => !headers.has(REQUIRED_COLUMNS[index])
  );

  const mapped = rows.map((row) => {
    const normalizedRow: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      normalizedRow[normalizeKey(key)] = value;
    });

    return {
      nombre: normalizedRow["herman@"] ?? "",
      domicilio: normalizedRow["domicilio"] ?? "",
      numero: normalizedRow["numero"] ?? "",
      letra: normalizedRow["letra"] ?? "",
      telefono: normalizedRow["telefono"] ?? "",
      recibo: normalizedRow["recibo"] ?? "",
      estado: normalizedRow["estado"] ?? ""
    };
  });

  return { rows: mapped, missingColumns };
}
