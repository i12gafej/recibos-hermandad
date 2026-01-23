export const YEAR_TOKEN = "{{AÑO}}";

export function buildId(nombre: string, domicilio: string, index: number) {
  const base = `${nombre}-${domicilio}-${index}`;
  return base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function buildText(
  row: {
    nombre: string;
    domicilio: string;
    numero: string;
    letra: string;
    recibo: string;
  },
  year: string
) {
  const numeroLetra = [row.numero, row.letra].filter(Boolean).join(" ").trim();
  const address = numeroLetra
    ? `${row.domicilio}, ${numeroLetra}`
    : row.domicilio;
  const yearValue = year.trim() ? year.trim() : YEAR_TOKEN;
  return `${row.nombre} (Calle ${address}) abona la cantidad de ${row.recibo}€ como pago de la cuota anual ${yearValue}`;
}

export function applyYearToText(text: string, year: string, lastYear: string) {
  const yearValue = year.trim();
  if (!yearValue) return text;
  if (text.includes(YEAR_TOKEN)) {
    return text.replace(YEAR_TOKEN, yearValue);
  }
  if (lastYear && text.includes(lastYear)) {
    return text.replace(lastYear, yearValue);
  }
  return text;
}
