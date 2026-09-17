import React, { useMemo } from 'react';
import { BarChart3, CheckCircle, AlertTriangle, Trash2, Calendar } from 'lucide-react';
import { ExpenseLog, UserProfile } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils/calculator';

interface HistoryViewProps {
  profile: UserProfile;
  expenseLogs: ExpenseLog[];
  fairDailyBudget: number;
  totalVariableSpent: number;
  onDeleteLog: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  profile,
  expenseLogs,
  fairDailyBudget,
  totalVariableSpent,
  onDeleteLog
}) => {
  const currency = profile.currencySymbol || '₹';

  // Group logs by dateKey
  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: ExpenseLog[] } = {};
    expenseLogs.forEach(log => {
      if (!groups[log.dateKey]) groups[log.dateKey] = [];
      groups[log.dateKey].push(log);
    });
    return groups;
  }, [expenseLogs]);

  // Last 7 days for bar chart
  const recentDays = useMemo(() => {
    const keys = Object.keys(groupedLogs).sort().slice(-7);
    return keys.map(dateKey => {
      const logs = groupedLogs[dateKey];
      const total = logs.reduce((sum, l) => sum + l.amount, 0);
      const sample = logs[0];
      const budget = sample ? sample.fairDailyBudgetAtTime : fairDailyBudget;
      return {
        dateKey,
        dayLabel: dateKey.substring(8), // "17"
        total,
        budget,
        isOver: total > budget
      };
    });
  }, [groupedLogs, fairDailyBudget]);

  const maxChartVal = useMemo(() => {
    const maxSpent = Math.max(...recentDays.map(d => d.total), 0);
    return Math.max(maxSpent, fairDailyBudget, 100) * 1.25;
  }, [recentDays, fairDailyBudget]);

  return (
    <div className="space-y-4 pb-20 p-4 max-w-lg mx-auto text-slate-100">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          Spending History & Chart
        </h1>
        <p className="text-xs text-slate-400">
          Daily spends vs recommended fair budget
        </p>
      </div>

      {/* Cycle Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-slate-400 block">Total Variable Spent</span>
            <span className="text-2xl font-black text-white block">
              {formatCurrency(totalVariableSpent, currency)}
            </span>
            <span className="text-[11px] text-slate-500">Current salary cycle</span>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <span className="text-xs text-emerald-400 block font-semibold">Active Daily Limit</span>
            <span className="text-2xl font-black text-emerald-400 block">
              {formatCurrency(fairDailyBudget, currency)}
              <span className="text-xs font-normal text-slate-400">/day</span>
            </span>
            <span className="text-[11px] text-slate-500">Target for today</span>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      {recentDays.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Daily Spend Comparison
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Within Limit
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Over Limit
              </span>
            </div>
          </div>

          {/* Chart Graphic */}
          <div className="relative h-44 flex items-end justify-between pt-6 pb-2 px-2 border-b border-slate-800">
            {/* Fair Daily Budget Reference Line */}
            {fairDailyBudget > 0 && (
              <div
                className="absolute left-0 right-0 border-b border-dashed border-emerald-500/60 z-10 pointer-events-none flex items-center justify-end pr-2"
                style={{
                  bottom: `${Math.min(100, (fairDailyBudget / maxChartVal) * 100)}%`
                }}
              >
                <span className="text-[9px] font-bold text-emerald-400 bg-slate-950/80 px-1 rounded -translate-y-2">
                  Budget {formatCurrency(fairDailyBudget, currency)}
                </span>
              </div>
            )}

            {/* Bars */}
            {recentDays.map((d, i) => {
              const heightPct = Math.min(100, Math.max(8, (d.total / maxChartVal) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative px-1">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-950 border border-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                    {formatCurrency(d.total, currency)}
                  </div>

                  {/* Bar */}
                  <div
                    className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                      d.isOver ? 'bg-rose-500 hover:bg-rose-400' : 'bg-emerald-500 hover:bg-emerald-400'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Day labels */}
          <div className="flex justify-between px-2 pt-2 text-[11px] text-slate-400">
            {recentDays.map((d, i) => (
              <span key={i} className="flex-1 text-center font-medium">
                Day {d.dayLabel}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grouped Logs Breakdown */}
      <div className="space-y-3">
        <span className="text-sm font-bold text-slate-200 block px-1">
          Daily Breakdown
        </span>

        {Object.keys(groupedLogs).length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
            No expenses logged yet. Log your daily spends to see full history comparisons.
          </div>
        ) : (
          Object.keys(groupedLogs)
            .sort()
            .reverse()
            .map(dateKey => {
              const logs = groupedLogs[dateKey];
              const dayTotal = logs.reduce((sum, l) => sum + l.amount, 0);
              const dayFairBudget = logs[0]?.fairDailyBudgetAtTime || fairDailyBudget;
              const isUnder = dayTotal <= dayFairBudget;

              return (
                <div key={dateKey} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {dateKey}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Fair target: {formatCurrency(dayFairBudget, currency)}/day
                      </span>
                    </div>

                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                      isUnder
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {isUnder ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {isUnder ? 'Under Budget' : 'Over Budget'}
                    </span>
                  </div>

                  {/* Items list */}
                  <div className="space-y-2">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-300 font-medium">{log.note}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            -{formatCurrency(log.amount, currency)}
                          </span>
                          <button
                            onClick={() => onDeleteLog(log.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total for day footer */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total Spent</span>
                    <span className={`font-bold ${isUnder ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(dayTotal, currency)}
                    </span>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};
