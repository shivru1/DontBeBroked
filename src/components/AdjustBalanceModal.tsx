import React, { useState } from 'react';
import { X, Wallet, Check, RotateCcw } from 'lucide-react';
import { formatCurrency } from '../utils/calculator';

interface AdjustBalanceModalProps {
  isOpen: boolean;
  currencySymbol: string;
  currentCalculatedBalance: number;
  currentActualBalance: number;
  isManualBalance: boolean;
  daysRemaining: number;
  onClose: () => void;
  onSaveBalance: (newBalance: number) => void;
  onRevertToCalculated: () => void;
}

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  isOpen,
  currencySymbol,
  currentCalculatedBalance,
  currentActualBalance,
  isManualBalance,
  daysRemaining,
  onClose,
  onSaveBalance,
  onRevertToCalculated
}) => {
  if (!isOpen) return null;

  const [balanceInput, setBalanceInput] = useState(
    currentActualBalance > 0 ? currentActualBalance.toString() : ''
  );

  const numericInput = parseFloat(balanceInput) || 0;
  const projectedDailyBudget = daysRemaining > 0 ? Math.round((numericInput / daysRemaining) * 100) / 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNaN(numericInput)) {
      onSaveBalance(numericInput);
      onClose();
    }
  };

  const handleQuickAdd = (delta: number) => {
    const current = parseFloat(balanceInput) || 0;
    const nextVal = Math.max(0, current + delta);
    setBalanceInput(nextVal.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Adjust Current Balance</h3>
              <p className="text-[11px] text-slate-400">Update your actual bank balance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative text */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
          Enter what you actually have in your bank account right now. DontBeBroke will recalculate your Fair Daily Limit so you reach payday safely.
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Current Bank Balance ({currencySymbol})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                autoFocus
                placeholder="e.g. 12000"
                value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-3 text-xl font-bold text-white placeholder:text-slate-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick delta buttons */}
          <div className="flex gap-1.5">
            {[+500, +1000, +2000, +5000].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAdd(amt)}
                className="flex-1 py-1.5 text-xs font-semibold bg-slate-800/70 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700/60 transition"
              >
                +{amt}
              </button>
            ))}
          </div>

          {/* Preview of impact on Fair Daily Limit */}
          {numericInput > 0 && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">New Fair Daily Limit:</span>
                <span className="text-base font-black text-emerald-400">
                  {formatCurrency(projectedDailyBudget, currencySymbol)} / day
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <span>Across {daysRemaining} days</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <button
            type="submit"
            disabled={!balanceInput.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition shadow-lg shadow-emerald-600/20"
          >
            <Check className="w-4 h-4" />
            Set Current Balance
          </button>
        </form>

        {/* Revert to auto-calculated if manual is currently active */}
        {isManualBalance && (
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                onRevertToCalculated();
                onClose();
              }}
              className="w-full text-xs font-medium text-slate-400 hover:text-slate-200 py-1.5 flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Revert to Auto-Calculated ({formatCurrency(currentCalculatedBalance, currencySymbol)})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default AdjustBalanceModal;
