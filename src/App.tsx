import { useMemo, useState } from "react";
import templateUrl from "./assets/plantilla.png";
import { readXlsx } from "./services/xlsx/service";
import { mapRows, REQUIRED_COLUMNS_LABELS } from "./services/templates/service";
import {
  applyYearToText,
  buildId,
  buildText,
  YEAR_TOKEN
} from "./services/templates/generator";
import { loadTemplate, renderTextOnTemplate } from "./services/images/service";
import { exportZip } from "./services/export/service";
import type { TemplateRow } from "./services/templates/service";

const STEPS = ["Subir", "Revisar", "Año", "Generar"] as const;

type TextItem = {
  id: string;
  row: TemplateRow;
  text: string;
  edited: boolean;
};

const TEXT_BOX = {
  x1: 160,
  y1: 260,
  x2: 690,
  y2: 320
};

const FONT = {
  size: 18,
  family: "'Times New Roman', Times, serif",
  color: "#111",
  weight: "bold"
};

export default function App() {
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<TextItem[]>([]);
  const [year, setYear] = useState("");
  const [lastYear, setLastYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const canContinue = useMemo(() => {
    if (step === 0) return items.length > 0;
    if (step === 1) return items.length > 0;
    if (step === 2) return year.trim().length > 0;
    return false;
  }, [items.length, step, year]);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const rawRows = await readXlsx(file, REQUIRED_COLUMNS_LABELS);
      const { rows, missingColumns } = mapRows(rawRows);
      if (missingColumns.length > 0) {
        setError(`Faltan columnas: ${missingColumns.join(", ")}`);
        setItems([]);
        setLoading(false);
        return;
      }
      const nextItems = rows.map((row, index) => ({
        id: buildId(row.nombre, row.domicilio, index),
        row,
        text: buildText(row, ""),
        edited: false
      }));
      setItems(nextItems);
      setStep(1);
    } catch (err) {
      setError("No se pudo leer el XLSX.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleEdit = (item: TextItem) => {
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const handleSave = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, text: editingText, edited: true }
          : item
      )
    );
    setEditingId(null);
    setEditingText("");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleYearChange = (value: string) => {
    setYear(value);
    setItems((prev) =>
      prev.map((item) => {
        if (!item.edited) {
          return { ...item, text: buildText(item.row, value) };
        }
        return {
          ...item,
          text: applyYearToText(item.text, value, lastYear)
        };
      })
    );
    setLastYear(value);
  };

  const handleGenerate = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setProgress(0);
    try {
      const img = await loadTemplate(templateUrl);
      const files: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        const blob = await renderTextOnTemplate(img, item.text, {
          textBox: TEXT_BOX,
          fontFamily: FONT.family,
          fontSize: FONT.size,
          color: FONT.color,
          fontWeight: FONT.weight
        });
        files.push({ name: `${item.id}.png`, blob });
        setProgress(Math.round(((i + 1) / items.length) * 100));
      }
      await exportZip(files, "recibos-hermandad.zip");
    } catch (err) {
      setError("No se pudieron generar las imagenes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Generador de recibos</p>
          <h1>Plantillas listas en minutos</h1>
          <p className="subtitle">
            Sube el Excel, revisa textos, fija el año y descarga el ZIP.
          </p>
        </div>
      </header>

      <div className="stepper">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={`step ${step === index ? "active" : ""} ${
              step > index ? "done" : ""
            }`}
          >
            <span>{index + 1}</span>
            <p>{label}</p>
          </div>
        ))}
      </div>

      <div className="content">
        <section className="panel">
          {step === 0 && (
            <div className="card">
              <h2>Sube tu XLSX</h2>
              <p className="hint">Clic para subir archivo XLSX o arrastralo aqui.</p>
              <div
                className="dropzone"
                onDrop={handleDrop}
                onDragOver={(event) => event.preventDefault()}
              >
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
                <span>Arrastra o toca para elegir</span>
              </div>
              <p className="micro">Columnas requeridas: Herman@, Domicilio, Numero, Letra, Telefono, Recibo, Estado.</p>
            </div>
          )}

          {step === 1 && (
            <div className="card">
              <h2>Revisa los textos</h2>
              <p className="hint">Edita cualquier linea si lo necesitas.</p>
              <div className="actions">
                <button
                  className="primary"
                  disabled={!canContinue}
                  onClick={() => setStep(2)}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card">
              <h2>Selecciona el año</h2>
              <p className="hint">Ese valor se aplica a todos los textos.</p>
              <input
                className="input"
                placeholder="2025"
                value={year}
                onChange={(event) => handleYearChange(event.target.value)}
              />
              <div className="actions">
                <button
                  className="primary"
                  disabled={!canContinue}
                  onClick={() => setStep(3)}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card">
              <h2>Genera las plantillas</h2>
              <p className="hint">Se descargara un ZIP con todas las imagenes.</p>
              <button
                className="primary"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? `Generando... ${progress}%` : "Generar plantillas"}
              </button>
            </div>
          )}

          {error && <div className="error">{error}</div>}
        </section>

        <aside className="list">
          <div className="list-header">
            <h3>Textos</h3>
            <span>{items.length} filas</span>
          </div>
          <div className="list-body">
            {items.map((item) => (
              <div key={item.id} className="list-item">
                <div className="list-text">
                  {editingId === item.id ? (
                    <textarea
                      value={editingText}
                      onChange={(event) => setEditingText(event.target.value)}
                    />
                  ) : (
                    <p>{item.text}</p>
                  )}
                </div>
                <div className="list-actions">
                  {editingId === item.id ? (
                    <>
                      <button className="icon" onClick={() => handleSave(item.id)}>
                        OK
                      </button>
                      <button className="icon" onClick={handleCancel}>
                        X
                      </button>
                    </>
                  ) : (
                    <button className="ghost" onClick={() => handleEdit(item)}>
                      Editar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
