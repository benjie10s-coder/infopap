// app/dashboard/loading.tsx — Dashboard skeleton loader
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-mist/30">
      {/* Top bar skeleton */}
      <div className="bg-white border-b border-mist">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="h-7 w-24 bg-mist rounded animate-pulse" />
          <div className="h-8 w-32 bg-mist rounded animate-pulse" />
        </div>
      </div>

      <div className="pl-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
          {/* Greeting skeleton */}
          <div>
            <div className="h-7 w-40 bg-mist rounded animate-pulse" />
            <div className="h-4 w-28 bg-mist rounded animate-pulse mt-2" />
          </div>

          {/* Table skeleton */}
          <div className="bg-white rounded-xl border border-mist">
            <div className="px-4 sm:px-6 py-4 border-b border-mist">
              <div className="h-5 w-32 bg-mist rounded animate-pulse" />
            </div>
            <div className="divide-y divide-mist">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4">
                  <div className="h-5 w-20 bg-mist rounded animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 bg-mist rounded animate-pulse" />
                    <div className="h-3 w-48 bg-mist rounded animate-pulse" />
                  </div>
                  <div className="h-9 w-16 bg-mist rounded-lg animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
