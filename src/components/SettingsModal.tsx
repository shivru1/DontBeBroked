import React, { useState } from 'react';
import { X, Save, Trash2, Plus, RotateCcw, Sliders } from 'lucide-react';
import { UserProfile, FixedExpense } from '../types';
import { formatCurrency } from '../utils/calculator';

interface SettingsModalProps {
  isOpen: boolean;
  profile: UserProfile;
  fixedExpenses: FixedExpense[];
  remainingBalance: number;
  onClose: () => void;
  onSaveProfile: (salary: number, salaryDay: number) => void;
  onSaveCurrentBalance: (balance: number) => void;
  onRevertToCalculatedBalance: () => void;
  onAddFixedExpense: (label: string, amount: number) => void;
  onRemoveFixedExpense: (id: string) => void;
  onResetAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  profile,
  fixedExpenses,
  remainingBalance,
  onClose,
  onSaveProfile,
  onSaveCurrentBalance,
  onRevertToCalculatedBalance,
  onAddFixedExpense,
  onRemoveFixedExpense,
  onResetAllData
}) => {
  if (!isOpen) return null;

  const [salary, setSalary] = useState(profile.monthlySalary.toString());
  const [salaryDay, setSalaryDay] = useState(profile.salaryDay);
  const [balanceInput, setBalanceInput] = useState(remainingBalance.toString());
  const [newFixedLabel, setNewFixedLabel] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [balanceSavedMsg, setBalanceSavedMsg] = useState(false);

  const currency = profile.currencySymbol || '₹';

  const handleSaveSalary = (e: React.FormEvent) => {
    e.preventDefault();
    const sal = parseFloat(salary);
    if (sal > 0) {
      onSaveProfile(sal, salaryDay);
    }
  };

  const handleUpdateBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const b = parseFloat(balanceInput);
    if (!isNaN(b)) {
      onSaveCurrentBalance(b);
      setBalanceSavedMsg(true);
      setTimeout(() => setBalanceSavedMsg(false), 2500);
    }
  };

  const handleAddFixed = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newFixedAmount);
    if (newFixedLabel.trim() && amt > 0) {
      onAddFixedExpense(newFixedLabel.trim(), amt);
      setNewFixedLabel('');
      setNewFixedAmount('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            Budget Settings
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Salary & Cycle Form */}
        <form onSubmit={handleSaveSalary} className="space-y-4 bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Monthly Income & Payday
          </h4>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Monthly In-Hand Salary ({currency})</label>
            <input
              type="number"
              value={salary}
              onChange={e => setSalary(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Salary Day of Month</label>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 5, 10, 25, 30].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSalaryDay(day)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                    salaryDay === day
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {day}th
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <Save className="w-3.5 h-3.5" />
            Update Salary & Payday
          </button>
        </form>

        {/* Current Balance Adjustment Form */}
        <form onSubmit={handleUpdateBalanceSubmit} className="space-y-3 bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Current Bank Balance
            </h4>
            {profile.manualBalance != null && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Custom Set
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Have a different amount in your account right now? Set it here and your fair daily budget will recalibrate.
          </p>

          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              value={balanceInput}
              onChange={e => setBalanceInput(e.target.value)}
              placeholder="e.g. 12000"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Update Balance
            </button>
          </div>

          {balanceSavedMsg && (
            <p className="text-xs font-semibold text-emerald-400">
              ✓ Balance updated successfully!
            </p>
          )}

          {profile.manualBalance != null && (
            <button
              type="button"
              onClick={() => {
                onRevertToCalculatedBalance();
                setBalanceInput(remainingBalance.toString());
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline pt-1 block"
            >
              Revert to auto-calculated (Salary − Fixed − Spent)
            </button>
          )}
        </form>

        {/* Fixed Confirmed Expenses */}
        <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Fixed Monthly Bills
            </h4>
            <span className="text-xs font-semibold text-slate-400">
              Total: {formatCurrency(fixedExpenses.reduce((s, e) => s + e.amount, 0), currency)}
            </span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {fixedExpenses.map(expense => (
              <div
                key={expense.id}
                className="flex items-center justify-between bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-2 text-xs"
              >
                <span className="font-medium text-slate-300">{expense.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{formatCurrency(expense.amount, currency)}</span>
                  <button
                    onClick={() => onRemoveFixedExpense(expense.id)}
                    className="text-slate-500 hover:text-rose-400 p-0.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Fixed Expense form */}
          <form onSubmit={handleAddFixed} className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="e.g. WiFi Bill"
              value={newFixedLabel}
              onChange={e => setNewFixedLabel(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <input
              type="number"
              placeholder="Amount"
              value={newFixedAmount}
              onChange={e => setNewFixedAmount(e.target.value)}
              className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!newFixedLabel.trim() || !newFixedAmount}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl px-2.5 flex items-center justify-center transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Reset App Data */}
        <div className="pt-2 border-t border-slate-800">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="w-full text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All App Data & Start Setup Fresh
            </button>
          ) : (
            <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-3 text-center space-y-2">
              <p className="text-xs text-rose-200">Are you sure? This will delete all expense logs and budget settings.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 bg-slate-800 text-xs py-1.5 rounded-lg text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetAllData();
                    onClose();
                  }}
                  className="flex-1 bg-rose-600 text-xs py-1.5 rounded-lg font-bold text-white hover:bg-rose-500"
                >
                  Yes, Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
