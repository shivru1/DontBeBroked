import React, { useState } from 'react';
import {
  Calendar,
  Send,
  Plus,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Wallet,
  Pencil
} from 'lucide-react';
import { ExpenseLog, ChatMessage, UserProfile } from '../types';
import { formatCurrency, formatShortDate } from '../utils/calculator';

interface DashboardViewProps {
  profile: UserProfile;
  remainingBalance: number;
  fairDailyBudget: number;
  daysRemaining: number;
  nextSalaryMs: number;
  totalFixedExpenses: number;
  totalVariableSpent: number;
  todaySpent: number;
  recentLogs: ExpenseLog[];
  latestAdvisorMessage?: ChatMessage;
  onOpenLogModal: () => void;
  onOpenAdjustBalance: () => void;
  onQuickLog: (text: string) => void;
  onNavigateToChat: () => void;
  onNavigateToHistory: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  remainingBalance,
  fairDailyBudget,
  daysRemaining,
  totalFixedExpenses,
  totalVariableSpent,
  todaySpent,
  recentLogs,
  latestAdvisorMessage,
  onOpenLogModal,
  onOpenAdjustBalance,
  onQuickLog,
  onNavigateToChat,
  onNavigateToHistory
}) => {
  const [quickText, setQuickText] = useState('');
  const currency = profile.currencySymbol || '₹';

  const isBroke = remainingBalance <= 0;
  const isOverBudgetToday = todaySpent > fairDailyBudget;
  const todayProgress = fairDailyBudget > 0 ? Math.min(100, (todaySpent / fairDailyBudget) * 100) : 0;
  const safeLeftoverToday = Math.max(0, fairDailyBudget - todaySpent);
  const isManualBalance = profile.manualBalance != null;

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickText.trim()) {
      onQuickLog(quickText.trim());
      setQuickText('');
    }
  };

  return (
    <div className="space-y-4 pb-20 p-4 max-w-lg mx-auto">
      {/* Top Bar / Status */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
            DontBeBroke
          </h1>
          <p className="text-xs text-slate-400">
            Fair daily spending tracker
          </p>
        </div>

        {/* Days remaining badge */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span><strong className="text-white">{daysRemaining}</strong> days to payday</span>
        </div>
      </div>

      {/* Hero Card: Remaining Balance */}
      <div className={`rounded-3xl p-5 border transition-all ${
        isBroke
          ? 'bg-gradient-to-br from-rose-950/80 to-slate-900 border-rose-600/50 text-white'
          : 'bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 text-white shadow-xl shadow-black/40'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            Remaining Balance
            {isManualBalance && (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                Manual
              </span>
            )}
          </span>
          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
            isBroke
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : isOverBudgetToday
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}>
            {isBroke ? 'DEFICIT ALERT' : isOverBudgetToday ? 'TIGHT SPEND' : 'ON TRACK'}
          </span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-4xl font-black tracking-tight text-white">
            {formatCurrency(remainingBalance, currency)}
          </div>
          <button
            type="button"
            onClick={onOpenAdjustBalance}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition"
            title="Change or set your current bank balance"
          >
            <Pencil className="w-3.5 h-3.5 text-emerald-400" />
            <span>Edit Balance</span>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Salary</span>
            <span className="font-bold text-slate-200">{formatCurrency(profile.monthlySalary, currency)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Fixed Bills</span>
            <span className="font-bold text-slate-200">{formatCurrency(totalFixedExpenses, currency)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Spent Cycle</span>
            <span className="font-bold text-slate-200">{formatCurrency(totalVariableSpent, currency)}</span>
          </div>
        </div>
      </div>

      {/* Today's Fair Daily Limit Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              Today's Fair Daily Limit
            </span>
            <div className="text-2xl font-black text-white">
              {formatCurrency(fairDailyBudget, currency)}
              <span className="text-xs font-normal text-slate-400 ml-1">/ day</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Spent Today</span>
            <span className={`text-lg font-bold ${isOverBudgetToday ? 'text-rose-400' : 'text-slate-200'}`}>
              {formatCurrency(todaySpent, currency)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden my-2 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverBudgetToday ? 'bg-rose-500' : todayProgress > 80 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${todayProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className={`font-semibold ${isOverBudgetToday ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isOverBudgetToday
              ? `Over budget by ${formatCurrency(todaySpent - fairDailyBudget, currency)}`
              : `${formatCurrency(safeLeftoverToday, currency)} safe to spend today`}
          </span>
          <span className="text-slate-500 text-[11px]">Recalculated after each log</span>
        </div>
      </div>

      {/* Quick Spend Entry (Chat-Style) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3">
        <form onSubmit={handleQuickSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Log spend (e.g. Spent ₹450 on lunch)"
            value={quickText}
            onChange={e => setQuickText(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!quickText.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl p-2.5 flex items-center justify-center transition shadow-md shadow-emerald-600/20"
            title="Log quick expense"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* AI Advisor Callout */}
      <div
        onClick={onNavigateToChat}
        className="cursor-pointer group bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 transition hover:border-emerald-500/60 shadow-md"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                AI Budget Advisor
              </span>
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 group-hover:text-emerald-400 transition">
                Talk <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
              {latestAdvisorMessage?.text ||
                `You have ${formatCurrency(remainingBalance, currency)} with ${daysRemaining} days left until your next salary (${formatCurrency(fairDailyBudget, currency)}/day). Log your expenses to stay balanced!`}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Expenses List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-emerald-400" />
            Recent Daily Spends
          </span>
          <button
            onClick={onNavigateToHistory}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            View All History →
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 text-center text-slate-400 text-xs">
            No expenses logged yet today. Tap the <strong className="text-emerald-400">+ button</strong> below or type an expense above.
          </div>
        ) : (
          <div className="space-y-2">
            {recentLogs.slice(0, 4).map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    log.wasWithinBudget ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {log.wasWithinBudget ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block leading-tight">{log.note}</span>
                    <span className="text-[11px] text-slate-500">
                      {formatShortDate(log.timestamp)} • Fair limit was {formatCurrency(log.fairDailyBudgetAtTime, currency)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-bold block ${log.wasWithinBudget ? 'text-slate-100' : 'text-rose-400'}`}>
                    -{formatCurrency(log.amount, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={onOpenLogModal}
        className="absolute right-5 bottom-20 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/30 transition transform hover:scale-105 active:scale-95 z-30"
        title="Log Expense"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>
    </div>
  );
};
