/**
 * Generador del reporte Excel del rol Docente (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Convierte el resultado de `calcularReporteDeporte` en un archivo `.xlsx` con
 * tres hojas: "Resumen", "Estudiantes" y "Asistencia por fecha". Se usa la
 * MISMA fuente de datos que la pantalla para que los números coincidan.
 *
 * ¿Cómo se relaciona con los demás?
 * Lo llama `docenteController.getReporteExcel`. Usa la librería `exceljs`
 * (dependencia autorizada para este módulo).
 */

import ExcelJS from "exceljs";
import type { ReporteDeporte } from "../services/docenteService.js";

const AZUL_OSCURO = "FF0B2447";
const VERDE = "FFDCFCE7";
const ROJO = "FFFEE2E2";
const AMARILLO = "FFFEF9C3";

/** Quita tildes, espacios y signos para formar un nombre de archivo seguro. */
export function slugDeporte(nombre: string): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return limpio.length > 0 ? limpio : "deporte";
}

/** Nombre del archivo: `reporte_<deporte>_<AAAA-MM-DD>.xlsx`. */
export function nombreArchivoReporte(nombreDeporte: string, fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `reporte_${slugDeporte(nombreDeporte)}_${y}-${m}-${d}.xlsx`;
}

function claveSesion(horarioId: string, fecha: string): string {
  return `${horarioId}|${fecha}`;
}

function etiquetaSesion(sesion: ReporteDeporte["sesiones"][number]): string {
  return `${sesion.fecha} ${sesion.hora_inicio.slice(0, 5)}`;
}

function encabezado(fila: ExcelJS.Row): void {
  fila.font = { bold: true, color: { argb: "FFFFFFFF" } };
  fila.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: AZUL_OSCURO },
  };
  fila.alignment = { vertical: "middle" };
}

/**
 * Construye el libro de Excel en memoria y lo devuelve como Buffer.
 * @param reporte Resultado de `calcularReporteDeporte`.
 */
export async function construirReporteExcel(reporte: ReporteDeporte): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Conecta BU — PISU";
  libro.created = new Date();

  // ---------------------------- Hoja: Resumen ----------------------------
  const resumen = libro.addWorksheet("Resumen");
  resumen.columns = [
    { header: "", key: "a", width: 28 },
    { header: "", key: "b", width: 32 },
    { header: "", key: "c", width: 24 },
    { header: "", key: "d", width: 24 },
  ];
  resumen.mergeCells("A1:D1");
  const titulo = resumen.getCell("A1");
  titulo.value = "Conecta BU — Reporte de asistencia PISU";
  titulo.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_OSCURO } };
  titulo.alignment = { horizontal: "center", vertical: "middle" };
  resumen.getRow(1).height = 26;

  const generado = new Date(reporte.generado).toLocaleString("es-CO");
  const filasResumen: Array<[string, string | number]> = [
    ["Deporte", reporte.deporte.nombre],
    ["Docente", reporte.docente],
    ["Periodo", reporte.periodo],
    ["Tipo de reporte", reporte.tipo],
    ["Mínimo de asistencia para aprobar", `${reporte.minimo}%`],
    ["Clases dictadas", reporte.dictadas],
    ["Total de estudiantes", reporte.total_estudiantes],
    ["Aprobados", reporte.aprobados],
    ["Reprobados", reporte.reprobados],
    ["Promedio de asistencia", `${reporte.promedio}%`],
    ["Generado", generado],
  ];
  let fila = 3;
  for (const [etiqueta, valor] of filasResumen) {
    resumen.getCell(`A${fila}`).value = etiqueta;
    resumen.getCell(`A${fila}`).font = { bold: true };
    resumen.getCell(`B${fila}`).value = valor;
    fila += 1;
  }

  fila += 1;
  resumen.getCell(`A${fila}`).value = "Horarios del deporte";
  resumen.getCell(`A${fila}`).font = { bold: true, size: 12 };
  fila += 1;
  const encabezadoHorarios = resumen.getRow(fila);
  encabezadoHorarios.values = ["Día", "Hora inicio", "Hora fin", "Lugar"];
  encabezado(encabezadoHorarios);
  fila += 1;
  for (const horario of reporte.horarios) {
    const row = resumen.getRow(fila);
    row.values = [horario.dia, horario.hora_inicio.slice(0, 5), horario.hora_fin.slice(0, 5), horario.lugar];
    fila += 1;
  }

  // -------------------------- Hoja: Estudiantes --------------------------
  const hoja = libro.addWorksheet("Estudiantes");
  hoja.columns = [
    { header: "Estudiante", key: "nombre", width: 30 },
    { header: "Documento", key: "documento", width: 16 },
    { header: "Categoría", key: "categoria", width: 14 },
    { header: "Correo", key: "correo", width: 34 },
    { header: "Clases asistidas", key: "presentes", width: 16 },
    { header: "Faltas", key: "faltas", width: 10 },
    { header: "Clases dictadas", key: "dictadas", width: 16 },
    { header: "% Asistencia", key: "porcentaje", width: 14 },
    { header: "Resultado", key: "resultado", width: 16 },
  ];
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  encabezado(hoja.getRow(1));
  for (const estudiante of reporte.estudiantes) {
    const row = hoja.addRow({
      nombre: estudiante.nombre,
      documento: estudiante.documento ?? "—",
      categoria: estudiante.categoria ?? "—",
      correo: estudiante.correo ?? "—",
      presentes: estudiante.presentes,
      faltas: estudiante.faltas,
      dictadas: estudiante.dictadas,
      porcentaje: estudiante.dictadas > 0 ? `${estudiante.porcentaje}%` : "Sin clases registradas",
      resultado: estudiante.dictadas > 0 ? (estudiante.aprobado ? "Aprobó" : "Reprobó") : "Sin clases registradas",
    });
    const color = estudiante.dictadas === 0 ? AMARILLO : estudiante.aprobado ? VERDE : ROJO;
    row.getCell("resultado").fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    row.getCell("resultado").font = { bold: true };
  }
  if (reporte.estudiantes.length > 0) {
    hoja.autoFilter = { from: "A1", to: `I${reporte.estudiantes.length + 1}` };
  }

  // --------------------- Hoja: Asistencia por fecha ----------------------
  const detalle = libro.addWorksheet("Asistencia por fecha");
  const columnasDetalle: Array<Partial<ExcelJS.Column>> = [
    { header: "Estudiante", key: "nombre", width: 28 },
    { header: "Documento", key: "documento", width: 16 },
  ];
  for (const sesion of reporte.sesiones) {
    columnasDetalle.push({
      header: etiquetaSesion(sesion),
      key: claveSesion(sesion.horario_id, sesion.fecha),
      width: 14,
    });
  }
  columnasDetalle.push({ header: "Faltas", key: "faltas", width: 10 });
  columnasDetalle.push({ header: "% Asistencia", key: "porcentaje", width: 14 });
  columnasDetalle.push({ header: "Resultado", key: "resultado", width: 16 });
  detalle.columns = columnasDetalle;
  detalle.views = [{ state: "frozen", xSplit: 2, ySplit: 1 }];
  encabezado(detalle.getRow(1));

  const totalColumnas = columnasDetalle.length;
  for (const estudiante of reporte.estudiantes) {
    const valores: Record<string, string | number> = {
      nombre: estudiante.nombre,
      documento: estudiante.documento ?? "—",
      faltas: estudiante.faltas,
      porcentaje: estudiante.dictadas > 0 ? `${estudiante.porcentaje}%` : "Sin clases registradas",
      resultado:
        estudiante.dictadas > 0
          ? estudiante.aprobado
            ? "Aprobó"
            : "Reprobó"
          : "Sin clases registradas",
    };
    for (const sesion of reporte.sesiones) {
      const clave = claveSesion(sesion.horario_id, sesion.fecha);
      const marca = reporte.matriz[estudiante.estudiante_id]?.[clave];
      valores[clave] = marca === undefined ? "—" : marca ? "P" : "A";
    }
    const row = detalle.addRow(valores);
    const color = estudiante.dictadas === 0 ? AMARILLO : estudiante.aprobado ? VERDE : ROJO;
    row.getCell(totalColumnas).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    row.getCell(totalColumnas).font = { bold: true };
  }
  if (reporte.estudiantes.length > 0 && reporte.sesiones.length > 0) {
    const ultimaColumna = detalle.getColumn(totalColumnas).letter;
    detalle.autoFilter = { from: "A1", to: `${ultimaColumna}${reporte.estudiantes.length + 1}` };
  }

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer as unknown as ArrayBuffer);
}
