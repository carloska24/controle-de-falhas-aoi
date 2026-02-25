export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6 flex justify-between items-center">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="h-8 bg-slate-700 rounded w-1/4"></div>
        </div>
        
        {/* KPIs Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 rounded-lg p-6">
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-slate-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="bg-slate-800/50 rounded-lg p-6">
          <div className="h-6 bg-slate-700 rounded w-1/2 mx-auto mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/3 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}

