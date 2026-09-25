import { afterEach, describe, expect, it } from "@jest/globals";
import {
  esCorreoInstitucional,
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
    expect(esCorreoInstitucional("a@correo.uniautonoma.edu.co")).toBe(false);
  });
});
