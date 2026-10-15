import axios from "axios";
import { leerToken, limpiarSesion } from "../auth/session";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = leerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Si el backend responde 401 con una sesión activa, la sesión venció o dejó de
 * ser válida: se limpia y se vuelve al inicio de sesión. Solo aplica cuando ya
 * había un token, para no interferir con errores propios del inicio de sesión.
 */
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && leerToken()) {
      limpiarSesion();
      window.location.reload();
    }
    return Promise.reject(error);
  },
);
