import React, { useState } from 'react';
import { X, Check, TrendingDown } from 'lucide-react';
import { formatCurrency, computeFairDailyBudget } from '../utils/calculator';

interface LogExpenseModalProps {
  isOpen: boolean;
  currencySymbol: string;
  currentBalance: number;
  fairDailyBudget: number;
  daysRemaining: number;
  onClose: () => void;
  onConfirm: (amount: number, note: string) => void;
}

export const LogExpenseModal: React.FC<LogExpenseModalProps> = ({
  isOpen,
  currencySymbol,
  currentBalance,
  fairDailyBudget,
  daysRemaining,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const newBalance = currentBalance - numAmount;
  const newDailyLimit = computeFairDailyBudget(newBalance, daysRemaining);

  const quickAmounts = [100, 250, 500, 1000];
  const quickCategories = ['Lunch / Food', 'Coffee / Tea', 'Cab / Metro', 'Groceries', 'Snacks'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount > 0) {
      onConfirm(numAmount, note.trim() || 'Daily Spend');
      setAmount('');
      setNote('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-400" />
            Log Daily Expense
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">
              Amount Spent
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                autoFocus
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-10 pr-4 py-3.5 text-2xl font-black text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex gap-2 mt-2">
              {quickAmounts.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs py-1.5 rounded-lg font-semibold transition"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Note / description input */}
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">
              What was this for?
            </label>
            <input
              type="text"
              placeholder="e.g. Lunch at subway, Uber ride"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            />

            {/* Category Quick Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNote(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                    note === cat
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Live Impact Preview */}
          {numAmount > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>New Remaining Balance:</span>
                <span className={`font-bold ${newBalance < 0 ? 'text-rose-400' : 'text-white'}`}>
                  {formatCurrency(newBalance, currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Adjusted Fair Daily Limit:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(newDailyLimit, currencySymbol)}/day
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={numAmount <= 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
            >
              <Check className="w-4 h-4" />
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
