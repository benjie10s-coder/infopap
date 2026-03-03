// app/dashboard/documents/loading.tsx — Loading state for document library
export default function DocumentLibraryLoading() {
  return (
    <div className="min-h-screen bg-mist/30">
      {/* Top bar skeleton */}
      <header className="bg-white border-b border-mist">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="h-8 w-24 bg-mist rounded animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-20 bg-mist rounded animate-pulse" />
            <div className="h-8 w-8 bg-mist rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      <div className="pl-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
          {/* Header skeleton */}
          <div>
            <div className="h-8 w-48 bg-mist rounded animate-pulse" />
            <div className="h-4 w-64 bg-mist rounded animate-pulse mt-2" />
          </div>

          {/* Stats skeleton — horizontal scroll on mobile */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-3 lg:grid-cols-7">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="shrink-0 p-3 sm:p-4 rounded-xl border border-mist bg-white min-w-[100px] sm:min-w-0">
                <div className="h-7 w-12 bg-mist rounded animate-pulse" />
                <div className="h-3 w-16 bg-mist rounded animate-pulse mt-2" />
              </div>
            ))}
          </div>

          {/* Search skeleton */}
          <div className="h-12 bg-white rounded-xl border border-mist animate-pulse" />

          {/* List skeleton */}
          <div className="bg-white rounded-xl border border-mist overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-mist last:border-b-0"
              >
                <div className="h-6 w-20 bg-mist rounded-full animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-5 w-32 bg-mist rounded animate-pulse" />
                  <div className="h-4 w-48 bg-mist rounded animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-16 bg-mist rounded-lg animate-pulse" />
                  <div className="h-9 w-16 bg-mist rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
