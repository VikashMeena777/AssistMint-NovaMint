'use client';

import { useEffect, useState } from 'react';
import { getInsights } from '@/lib/actions/insights-actions';
import type { Insight } from '@/lib/services/insights-service';
import { Sparkles } from 'lucide-react';

export default function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { insights: data } = await getInsights();
      setInsights(data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">AI Insights</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/30 bg-muted/20 p-4 animate-pulse">
              <div className="h-4 w-16 bg-muted rounded mb-2" />
              <div className="h-6 w-20 bg-muted rounded mb-1" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">AI Insights</h2>
        <span className="text-xs text-muted-foreground ml-auto">Updated every 30s</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`rounded-xl border p-4 transition-colors ${
              insight.type === 'positive'
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : insight.type === 'warning'
                ? 'border-amber-500/20 bg-amber-500/5'
                : 'border-border/30 bg-muted/20'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{insight.icon}</span>
              <span className="text-xs text-muted-foreground font-medium truncate">{insight.title}</span>
            </div>
            <div className="text-lg font-bold truncate">{insight.value}</div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{insight.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
