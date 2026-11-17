/**
 * Shown while a page's data streams in: shaped like the list or form that is coming, so nothing jumps.
 * It is also the Suspense boundary that lets navigations render the shell at once.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Carregando" className="flex animate-pulse flex-col gap-4">
      <div className="h-8 w-48 rounded-lg bg-gray-200" />
      <div className="h-10 w-full max-w-md rounded-lg bg-gray-200" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-11 rounded-lg bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
