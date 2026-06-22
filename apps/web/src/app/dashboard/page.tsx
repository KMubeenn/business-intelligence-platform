"use client";

import { useEffect, useState } from "react";
import { getOverallMetrics, getAggregatedData, OverallMetrics } from "@/lib/api/analytics";
import { getCanonicalModels, CanonicalModel } from "@/lib/api/canonical-models";
import { MetricCard, TimeSeriesChart, CategoryBarChart } from "@/components/dashboard-charts";
import { Database, Layers, CheckCircle2 } from "lucide-react";

export default function Dashboard() {
  const [metrics, setMetrics] = useState<OverallMetrics | null>(null);
  const [models, setModels] = useState<CanonicalModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [m, cModels] = await Promise.all([
          getOverallMetrics(),
          getCanonicalModels()
        ]);
        setMetrics(m);
        setModels(cModels);
        if (cModels.length > 0) {
          setSelectedModel(cModels[0].id);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadChartData() {
      if (!selectedModel) return;
      try {
        // For the MVP, we just fetch the raw data and let Recharts aggregate it or plot it as is.
        // In a real scenario we'd pass dynamic metric/groupBy params based on the model's schema.
        const result = await getAggregatedData(selectedModel);
        let dataToSet = result.data;
        if (result.type === 'raw') {
          dataToSet = dataToSet.reverse(); // oldest to newest for time series
        }
        
        // Auto-cast strings to numbers for charts and format dates
        dataToSet = dataToSet.map(row => {
          const newRow = { ...row };
          for (const key in newRow) {
            if (typeof newRow[key] === 'string' && !isNaN(Number(newRow[key])) && newRow[key].trim() !== '') {
              newRow[key] = Number(newRow[key]);
            } else if (typeof newRow[key] === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('time'))) {
              const d = new Date(newRow[key]);
              if (!isNaN(d.getTime())) {
                newRow[key] = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }
            }
          }
          return newRow;
        });

        setChartData(dataToSet);
      } catch (err) {
        console.error("Failed to load chart data", err);
      }
    }
    loadChartData();
  }, [selectedModel]);

  const [selectedSource, setSelectedSource] = useState<string>("all");

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground animate-pulse">Loading command center...</div>;
  }

  // Extract all available sources from the fetched data
  const allAvailableSources = Array.from(new Set(chartData.map(r => r._source || 'Unknown')));

  // Filter chart data by selected source
  const filteredChartData = selectedSource === "all" ? chartData : chartData.filter(r => (r._source || 'Unknown') === selectedSource);

  // Auto-detect fields for charts if raw data is returned
  let xKey = "";
  let yKey = "";
  let sources = new Set<string>();
  let groupedTimeSeriesData: any[] = [];
  let yKeys: string[] = [];

  if (filteredChartData.length > 0) {
    // Find the first record that actually has mapped keys AND a date field
    let representativeRecord = filteredChartData.find(row => {
      const keys = Object.keys(row).filter(k => k !== '_source');
      return keys.some(k => {
        const lower = k.toLowerCase();
        return lower.includes('date') || lower.includes('time') || lower.includes('created') || lower.includes('stamp');
      });
    });
    
    if (!representativeRecord) {
      representativeRecord = filteredChartData.find(row => Object.keys(row).filter(k => k !== '_source').length > 0);
    }
    
    if (representativeRecord) {
      const keys = Object.keys(representativeRecord).filter(k => k !== '_source');
      // Try to find a date field for X axis
      xKey = keys.find(k => {
        const lower = k.toLowerCase();
        return lower.includes('date') || lower.includes('time') || lower.includes('created') || lower.includes('stamp');
      }) || keys[0];
      // Try to find a numeric field for Y axis
      yKey = keys.find(k => k !== xKey && typeof representativeRecord![k] === 'number') || keys.find(k => k !== xKey && !isNaN(Number(representativeRecord![k])) && representativeRecord![k] !== '') || keys.find(k => k !== xKey) || keys[0];
    }

    // Group the data by date and data source for the time series
    const groupedData: Record<string, any> = {};
    
    filteredChartData.forEach(row => {
      let xVal = row[xKey];
      
      // Skip records with empty or invalid dates for the time series
      if (!xVal || String(xVal).trim() === '' || String(xVal) === 'undefined') {
        return;
      }
      
      // If the xVal looks like a valid date, group it by day
      if (typeof xVal === 'string' && !isNaN(Date.parse(xVal))) {
        const dateObj = new Date(xVal);
        xVal = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      const yVal = row[yKey];
      const source = row._source || 'Unknown';
      sources.add(source);

      if (!groupedData[xVal]) {
        groupedData[xVal] = { [xKey]: xVal };
      }
      if (!groupedData[xVal][source]) {
        groupedData[xVal][source] = 0;
      }
      
      const parsedY = typeof yVal === 'number' ? yVal : Number(yVal);
      groupedData[xVal][source] += (!isNaN(parsedY) ? parsedY : 0);
    });

    // Sort chronologically
    groupedTimeSeriesData = Object.values(groupedData).sort((a, b) => {
      const dateA = new Date(a[xKey]);
      const dateB = new Date(b[xKey]);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateA.getTime() - dateB.getTime();
      }
      return String(a[xKey]).localeCompare(String(b[xKey]));
    });

    yKeys = Array.from(sources);
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Center</h1>
          <p className="text-muted-foreground mt-1">Overview of your Business Intelligence pipeline.</p>
        </div>
      </div>
      
      {/* High Level Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard 
          title="Data Sources" 
          value={metrics?.totalSources || 0} 
          icon={Database} 
          description="Active external connections" 
        />
        <MetricCard 
          title="Canonical Models" 
          value={metrics?.totalModels || 0} 
          icon={Layers} 
          description="Defined golden schemas" 
        />
        <MetricCard 
          title="Normalized Records" 
          value={metrics?.totalNormalizedRecords || 0} 
          icon={CheckCircle2} 
          trend="up"
          description="Ready for analytics" 
        />
      </div>

      {models.length === 0 ? (
        <div className="bg-card border border-border rounded-lg shadow-sm p-12 text-center mt-4">
          <h3 className="text-lg font-medium">No Golden Schemas yet</h3>
          <p className="text-muted-foreground mt-2">Create a Canonical Model and map a data source to see visualizations.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Data Visualization</h2>
            <div className="flex items-center gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
              >
                <option value="all">All Sources</option>
                {allAvailableSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-7 mt-2">
              <TimeSeriesChart 
                title={`${models.find(m => m.id === selectedModel)?.name} Over Time`} 
                data={groupedTimeSeriesData} 
                xKey={xKey} 
                yKeys={yKeys} 
              />
              <CategoryBarChart 
                title={`${yKey} Distribution`} 
                data={chartData.slice(0, 10)} // Using top 10 raw data or we could group this too
                xKey={xKey} 
                yKey={yKey} 
              />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <p className="text-muted-foreground">No data has been synced for this model yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
