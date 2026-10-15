import "dotenv/config";

// En las pruebas, por defecto se ignora la ventana horaria para que las
// asistencias de fechas fijas (por ejemplo en alertas) siempre se registren.
// Se asigna de forma directa porque el archivo .env del proyecto define la
// variable como "false" y dotenv ya la habría cargado. La prueba específica de
// la ventana la vuelve a poner en "false" de forma explícita.
process.env["ASISTENCIA_IGNORAR_HORARIO"] = "true";
