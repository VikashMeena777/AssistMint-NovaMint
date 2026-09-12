'use client';

import { useEffect, useState, useCallback } from 'react';
import { getInsights } from '@/lib/actions/insights-actions';
import type { Insight } from '@/lib/services/insights-service';
import { Sparkles } from 'lucide-react';

export default function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { insights: data } = await getInsights();
      setInsights(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load insights:', err);
      setError('Could not load. Please retry.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      loadData();
    })();
  }, [loadData]);

  const handleRetry = () => {
    setError(null);
    loadData();
  };

  if (error && insights.length === 0) {
    return (
      <div className="bg-card shadow-sm rounded-2xl p-6">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-4 rounded-xl border px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-card shadow-sm rounded-2xl p-6">
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
    <div className="bg-card shadow-sm rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">AI Insights</h2>
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
