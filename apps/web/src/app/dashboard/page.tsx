export default function Dashboard() {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Overview</h1>
          <p className="text-zinc-500 mt-1">Welcome back. Here is what is happening today.</p>
        </div>
      </div>
      
      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
        <h3 className="text-2xl font-bold tracking-tight text-zinc-950 mb-2">
          Your command center
        </h3>
        <p className="text-zinc-500 max-w-md">
          Connect your first data source to begin pulling in raw data, or jump into the models tab to start structuring your insights.
        </p>
      </div>
    </div>
  )
}
