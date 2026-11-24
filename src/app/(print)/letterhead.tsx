/** School letterhead of the printouts. */
export function Letterhead() {
  return (
    <header className="mb-2 flex items-center justify-between border-b border-gray-900 pb-2">
      <div>
        <p className="text-[13pt] font-bold">ÚNICO EDUCACIONAL</p>
        <p>SGAS 606 BLOCO F PARTE A ASA SUL - Brasília - DF CEP:70200-660</p>
        <p>Telefone: (61)3244-0910</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- print page */}
      <img src="/img/Logo_light.png" alt="Único Educacional" className="h-14 w-auto" />
    </header>
  );
}

export const box = "border border-gray-900 px-1 py-0.5";
export const page =
  "mx-auto my-6 max-w-[210mm] bg-white p-[10mm] text-[9pt] shadow-lg print:m-0 print:max-w-none print:p-0 print:shadow-none";
