/** A data panel (white, panel-lift shadow) holding one part of the record. */
export function Panel({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-4 rounded-lg bg-white p-5 drop-shadow-md sm:p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}
