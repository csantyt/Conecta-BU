import { afterEach, describe, expect, it } from "@jest/globals";
import {
  esCorreoInstitucional,
  normalizarCorreoInstitucional,
  obtenerDominioInstitucional,
  ROLES,
} from "../../src/modules/auth/roles.js";

describe("auth/roles (unitaria)", () => {
  const original = process.env["GOOGLE_HOSTED_DOMAIN"];

  afterEach(() => {
    if (original === undefined) {
      delete process.env["GOOGLE_HOSTED_DOMAIN"];
    } else {
      process.env["GOOGLE_HOSTED_DOMAIN"] = original;
    }
  });

  it("expone los roles de Conecta BU", () => {
    expect(ROLES.USUARIO).toBe("USUARIO");
    expect(ROLES.ADMINISTRADOR).toBe("ADMINISTRADOR");
  });

  it("usa uniautonoma.edu.co por defecto", () => {
    delete process.env["GOOGLE_HOSTED_DOMAIN"];
    expect(obtenerDominioInstitucional()).toBe("uniautonoma.edu.co");
  });

  it("normaliza dominio con @ y mayúsculas", () => {
    process.env["GOOGLE_HOSTED_DOMAIN"] = "@UniAutonoma.EDU.CO";
    expect(obtenerDominioInstitucional()).toBe("uniautonoma.edu.co");
  });

  it("acepta correos institucionales", () => {
    process.env["GOOGLE_HOSTED_DOMAIN"] = "uniautonoma.edu.co";
    expect(esCorreoInstitucional("estudiante@uniautonoma.edu.co")).toBe(true);
    expect(esCorreoInstitucional("ESTUDIANTE@UNIAUTONOMA.EDU.CO")).toBe(true);
  });

  it("rechaza gmail y otros dominios", () => {
    process.env["GOOGLE_HOSTED_DOMAIN"] = "uniautonoma.edu.co";
    expect(esCorreoInstitucional("persona@gmail.com")).toBe(false);
    expect(esCorreoInstitucional("persona@hotmail.com")).toBe(false);
    expect(esCorreoInstitucional("a@correo.uniautonoma.edu.co")).toBe(false);
  });

  // Sección 10.1: normalización (espacios y mayúsculas) y comparación EXACTA
  // del dominio, para no aceptar dominios que solo lo contienen.
  it("normaliza espacios al inicio y al final", () => {
    process.env["GOOGLE_HOSTED_DOMAIN"] = "uniautonoma.edu.co";
    expect(esCorreoInstitucional("  estudiante@uniautonoma.edu.co  ")).toBe(true);
    expect(normalizarCorreoInstitucional(" Estudiante@Uniautonoma.Edu.Co ")).toBe(
      "estudiante@uniautonoma.edu.co",
    );
  });

  it("rechaza dominios parecidos que solo contienen el texto institucional", () => {
    process.env["GOOGLE_HOSTED_DOMAIN"] = "uniautonoma.edu.co";
    expect(esCorreoInstitucional("estudiante@uniautonoma.edu.co.otrodominio.com")).toBe(
      false,
    );
    expect(esCorreoInstitucional("estudiante@otrouniautonoma.edu.co")).toBe(false);
    expect(esCorreoInstitucional("estudiante@uniautonoma.edu.com")).toBe(false);
    expect(esCorreoInstitucional("estudiante@notuniautonoma.edu.co")).toBe(false);
  });

  it("rechaza correos con espacios internos o con varios @", () => {
    process.env["GOOGLE_HOSTED_DOMAIN"] = "uniautonoma.edu.co";
    expect(esCorreoInstitucional("estu diante@uniautonoma.edu.co")).toBe(false);
    expect(esCorreoInstitucional("a@b@uniautonoma.edu.co")).toBe(false);
    expect(esCorreoInstitucional("@uniautonoma.edu.co")).toBe(false);
    expect(esCorreoInstitucional("estudiante@")).toBe(false);
    expect(esCorreoInstitucional("")).toBe(false);
  });

  it("normaliza el dominio institucional configurado con espacios", () => {
    process.env["GOOGLE_HOSTED_DOMAIN"] = "  @UniAutonoma.EDU.CO  ";
    expect(obtenerDominioInstitucional()).toBe("uniautonoma.edu.co");
    expect(esCorreoInstitucional(" Estudiante@uniautonoma.edu.co ")).toBe(true);
  });
});
