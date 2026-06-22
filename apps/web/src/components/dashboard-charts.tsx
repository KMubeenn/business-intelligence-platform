"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Activity, BarChart3, TrendingUp } from "lucide-react";

export function MetricCard({ title, value, description, icon: Icon, trend }: { title: string, value: string | number, description?: string, icon?: any, trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : <Activity className="h-4 w-4 text-primary" />}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center">
            {trend === 'up' && <span className="text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded mr-2 font-medium">↑</span>}
            {trend === 'down' && <span className="text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded mr-2 font-medium">↓</span>}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#2dd4bf'];

export function TimeSeriesChart({ data, xKey, yKeys, title, description }: { data: any[], xKey: string, yKeys: string[], title: string, description?: string }) {
  return (
    <Card className="col-span-1 lg:col-span-4 hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pl-0 pb-6">
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <defs>
                {yKeys.map((key, i) => (
                  <linearGradient key={`color-${key}`} id={`colorY-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis 
                dataKey={xKey} 
                stroke="#a1a1aa" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10}
                label={{ value: xKey, position: 'insideBottom', offset: -15, fill: '#71717a', fontSize: 12 }}
              />
              <YAxis 
                stroke="#a1a1aa" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value}`} 
                tickMargin={10}
                label={{ value: yKeys.length > 0 ? 'total' : '', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 12, offset: -5 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                itemStyle={{ fontWeight: 'bold' }}
                cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
              {yKeys.map((key, i) => (
                <Area 
                  key={key}
                  name={key}
                  type="monotone" 
                  dataKey={key} 
                  stroke={CHART_COLORS[i % CHART_COLORS.length]} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill={`url(#colorY-${i})`} 
                  activeDot={{ r: 6, fill: CHART_COLORS[i % CHART_COLORS.length], stroke: '#18181b', strokeWidth: 2 }}
                  connectNulls={true}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryBarChart({ data, xKey, yKey, title, description }: { data: any[], xKey: string, yKey: string, title: string, description?: string }) {
  return (
    <Card className="col-span-1 lg:col-span-3 hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pl-0 pb-6">
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis 
                dataKey={xKey} 
                stroke="#a1a1aa" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickMargin={10} 
                label={{ value: xKey, position: 'insideBottom', offset: -15, fill: '#71717a', fontSize: 12 }}
              />
              <YAxis 
                stroke="#a1a1aa" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickMargin={10} 
                label={{ value: yKey, angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 12, offset: -5 }}
              />
              <Tooltip 
                cursor={{ fill: '#27272a', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
              />
              <Bar 
                dataKey={yKey} 
                fill="#34d399" 
                radius={[6, 6, 0, 0]} 
                activeBar={{ fill: '#10b981' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
