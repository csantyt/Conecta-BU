/**
 * Tarjeta "Mi perfil" del rol Estudiante (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Muestra los datos verificados del usuario (nombre, correo y rol) y permite
 * completar la CATEGORÍA académica, que no puede inferirse del correo
 * institucional. Es necesaria para inscribirse en deportes y eventos.
 *
 * ¿Cómo se relaciona con los demás?
 * Llama a `PATCH /estudiante/perfil` (sección 10.1: no inventar datos
 * personales) y luego pide al padre recargar la información confirmada por el
 * servidor.
 */

import { useState } from "react";
import { completarPerfilPisu } from "../../api/deporte";
import type { PerfilPisu } from "../../types/deporte";
import { Badge, Button, Card, Select } from "./ui";
import { mensajeError } from "./utils";

type Categoria = "Pregrado" | "Postgrado" | "Egresado";

const CATEGORIAS: Categoria[] = ["Pregrado", "Postgrado", "Egresado"];

type Props = {
  perfil: PerfilPisu | null;
  onAviso: (mensaje: string, accion?: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void> | void;
};

export default function CompletarPerfilPisu({
  perfil,
  onAviso,
  onError,
  onRecargar,
}: Props) {
  const [categoria, setCategoria] = useState<Categoria>("Pregrado");
  const [guardando, setGuardando] = useState(false);

  if (!perfil) {
    return null;
  }

  const faltaCategoria = !perfil.categoria;

  async function guardar() {
    setGuardando(true);
    try {
      const actualizado = await completarPerfilPisu(categoria);
      onAviso(`Categoría actualizada a ${actualizado.categoria ?? categoria}.`);
      // Refresca con la información confirmada por el servidor.
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{perfil.nombre}</p>
          <p className="text-xs text-slate-400">{perfil.correo}</p>
        </div>
        <Badge tone={perfil.rol === "Estudiante" ? "neutral" : "success"}>
          {perfil.rol}
        </Badge>
      </div>

      {faltaCategoria ? (
        <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
          <p className="text-xs text-amber-100">
            Para inscribirte en deportes y eventos necesitamos tu categoría
            académica. No la asignamos automáticamente: elígela tú.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px]">
              <Select
                label="Categoría"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Categoria)}
              >
                {CATEGORIAS.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </Select>
            </div>
            <Button disabled={guardando} onClick={() => void guardar()}>
              {guardando ? "Guardando..." : "Guardar categoría"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-300">
          Categoría: <span className="font-semibold">{perfil.categoria}</span>
        </p>
      )}
    </Card>
  );
}
