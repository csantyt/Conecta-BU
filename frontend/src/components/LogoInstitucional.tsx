type LogoInstitucionalProps = {
  className?: string;
  variante?: "claro" | "oscuro";
};

export default function LogoInstitucional({
  className = "h-20 w-auto",
  variante = "oscuro",
}: LogoInstitucionalProps) {
  const contraste = variante === "claro" ? "brightness-0" : "";

  return (
    <img
      src="/branding/logo.svg"
      alt="Uniautónoma del Cauca"
      className={`object-contain ${contraste} ${className}`}
    />
  );
}
