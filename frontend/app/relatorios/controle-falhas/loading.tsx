export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6 flex justify-between items-center">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="h-8 bg-slate-700 rounded w-1/4"></div>
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
