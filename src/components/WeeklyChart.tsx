import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { formatINR } from '../utils/currency';
import { formatCurrency } from '../utils/currencyFormatter';
import { DaySummary } from '../types';

interface WeeklyChartProps {
  days: DaySummary[];
  isDark?: boolean;
  currency?: string;
}

export function WeeklyChart({ days, isDark = false, currency = 'INR' }: WeeklyChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = days.map((d) => d.name);
    const incomeData = days.map((d) => d.income);
    const expenseData = days.map((d) => d.expense);

    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: `Income (${currency})`,
            data: incomeData,
            backgroundColor: 'rgba(22, 163, 74, 0.85)',
            hoverBackgroundColor: 'rgba(22, 163, 74, 1)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: `Expense (${currency})`,
            data: expenseData,
            backgroundColor: 'rgba(225, 29, 72, 0.85)',
            hoverBackgroundColor: 'rgba(225, 29, 72, 1)',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: {
                size: 12,
                weight: 'bold',
              },
              color: isDark ? '#e2e8f0' : '#334155',
            },
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const val = Number(context.parsed.y) || 0;
                return ` ${label}: ${formatCurrency(val, currency)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: textColor,
              font: { size: 12, weight: 'bold' },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
              font: { size: 11 },
              callback: (value) => formatCurrency(Number(value), currency, { compact: true }),
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
  }, [days, isDark, currency]);

  return (
    <div className="relative w-full h-56 sm:h-64">
      <canvas ref={canvasRef} />
    </div>
  );
}
