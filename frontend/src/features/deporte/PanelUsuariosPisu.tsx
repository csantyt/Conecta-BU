import { useEffect, useState } from "react";
import { asignarRolPisuAdmin, obtenerUsuariosPisuAdmin } from "../../api/deporte";
import type { PerfilPisu, UsuarioPisuAdmin } from "../../types/deporte";
import { mensajeError } from "./utils";

type PanelUsuariosPisuProps = {
  perfil: PerfilPisu;
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
  onRecargarSesion: () => Promise<void>;
};

const ROLES: PerfilPisu["rol"][] = ["Estudiante", "Docente", "Administrador"];

export default function PanelUsuariosPisu({
  perfil,
  onAviso,
  onError,
  onRecargarSesion,
}: PanelUsuariosPisuProps) {
  const [usuarios, setUsuarios] = useState<UsuarioPisuAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState<string | null>(null);

  async function recargar() {
    setCargando(true);
    try {
      setUsuarios(await obtenerUsuariosPisuAdmin());
    } catch (error) {
      onError(mensajeError(error));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void recargar();
  }, []);

  async function asignar(usuario: UsuarioPisuAdmin, rol: PerfilPisu["rol"]) {
    const clave = usuario.id ?? usuario.auth_usuario_id ?? usuario.correo;
    setEnviando(clave);
    try {
      await asignarRolPisuAdmin({
        id: usuario.id,
        authUsuarioId: usuario.auth_usuario_id,
        rol,
        categoria: rol === "Estudiante" ? usuario.categoria ?? "Pregrado" : null,
      });
      onAviso(
        rol === "Docente"
          ? `${usuario.nombre} ahora es docente PISU. Al entrar a Deporte verá Tomar asistencia.`
          : `${usuario.nombre} ahora es ${rol}.`,
      );
      const soyYo =
        usuario.correo.toLowerCase() === perfil.correo.toLowerCase();
      if (soyYo) {
        await onRecargarSesion();
      }
      await recargar();
    } catch (error) {
      onError(mensajeError(error));
    } finally {
      setEnviando(null);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 sm:p-6">
      <h2 className="text-lg font-semibold">Usuarios PISU</h2>
      <p className="mt-1 text-sm text-slate-500">
        El login siempre es Google. Aquí defines si esa persona es estudiante,
        docente o administrador de Deporte.
      </p>

      {cargando ? (
        <p className="mt-4 text-sm text-slate-500">Cargando usuarios...</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2 font-medium">Persona</th>
                <th className="px-2 py-2 font-medium">Rol PISU</th>
                <th className="px-2 py-2 text-right font-medium">Asignar</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((item) => {
                const clave = item.id ?? item.auth_usuario_id ?? item.correo;
                return (
                  <tr key={clave} className="border-b border-slate-100">
                    <td className="px-2 py-3">
                      <p className="font-medium">{item.nombre}</p>
                      <p className="text-xs text-slate-500">{item.correo}</p>
                    </td>
                    <td className="px-2 py-3">
                      {item.rol ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium">
                          {item.rol}
                          {item.categoria ? ` · ${item.categoria}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Aún no entra a Deporte
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {ROLES.map((rol) => (
                          <button
                            key={rol}
                            type="button"
                            disabled={enviando === clave || item.rol === rol}
                            onClick={() => void asignar(item, rol)}
                            className={`rounded-lg px-2.5 py-1 text-xs ${
                              item.rol === rol
                                ? "bg-slate-900 text-white"
                                : "border border-slate-300 disabled:opacity-40"
                            }`}
                          >
                            {rol === "Docente" ? "Hacer docente" : rol}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
