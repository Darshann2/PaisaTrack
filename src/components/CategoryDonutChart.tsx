import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { formatCurrency } from '../utils/currencyFormatter';

interface CategoryDonutChartProps {
  categories: { name: string; amount: number; percentage: number; color?: string }[];
  isDark?: boolean;
  currency?: string;
}

const PALETTE = [
  '#0284c7', // Sky
  '#16a34a', // Emerald
  '#ea580c', // Orange
  '#e11d48', // Rose
  '#8b5cf6', // Violet
  '#eab308', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#64748b', // Slate
  '#10b981', // Teal
];

export function CategoryDonutChart({ categories, isDark = false, currency = 'INR' }: CategoryDonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    if (categories.length === 0) return;

    const labels = categories.map((c) => c.name);
    const data = categories.map((c) => c.amount);
    const colors = categories.map((c, i) => c.color || PALETTE[i % PALETTE.length]);

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderColor: isDark ? '#0f172a' : '#ffffff',
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const val = Number(context.raw) || 0;
                const total = context.dataset.data.reduce((a, b) => Number(a) + Number(b), 0);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                return ` ${context.label}: ${formatCurrency(val, currency)} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [categories, isDark, currency]);

  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-slate-400">
        No expense data for this period
      </div>
    );
  }

  return (
    <div className="relative w-full h-52">
      <canvas ref={canvasRef} />
    </div>
  );
}
