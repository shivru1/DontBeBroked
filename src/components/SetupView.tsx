import React, { useState } from 'react';
import { TrendingUp, Calendar, Trash2, Plus, ArrowRight, ShieldCheck } from 'lucide-react';
import { calculateCycle, computeFairDailyBudget, formatCurrency, formatDisplayDate } from '../utils/calculator';
import { FixedExpense } from '../types';

interface SetupViewProps {
  onComplete: (salary: number, salaryDay: number, fixedExpenses: FixedExpense[]) => void;
}

export const SetupView: React.FC<SetupViewProps> = ({ onComplete }) => {
  const [salary, setSalary] = useState<string>('60000');
  const [salaryDay, setSalaryDay] = useState<number>(1);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([
    { id: '1', label: 'Rent', amount: 15000 },
    { id: '2', label: 'Loan EMI', amount: 8000 },
    { id: '3', label: 'Insurance', amount: 2000 }
  ]);

  const [newLabel, setNewLabel] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');

  const numSalary = parseFloat(salary) || 0;
  const totalFixed = fixedExpenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBalance = Math.max(0, numSalary - totalFixed);

  const cycle = calculateCycle(salaryDay);
  const fairDailyBudget = computeFairDailyBudget(remainingBalance, cycle.daysRemaining);

  const handleAddFixed = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    if (newLabel.trim() && amt > 0) {
      setFixedExpenses(prev => [...prev, { id: Date.now().toString(), label: newLabel.trim(), amount: amt }]);
      setNewLabel('');
      setNewAmount('');
    }
  };

  const handleRemoveFixed = (id: string) => {
    setFixedExpenses(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              DontBeBroke
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-emerald-500/30">
                Advisor
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Fair daily spend limit • Never run out of money before payday
            </p>
          </div>
        </div>

        {/* Step 1: Monthly Salary */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-slate-200 mb-1">
            1. Monthly Salary
          </label>
          <p className="text-xs text-slate-400 mb-3">
            In-hand monthly income deposited into your bank
          </p>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-emerald-400">
              ₹
            </span>
            <input
              type="number"
              value={salary}
              onChange={e => setSalary(e.target.value)}
              placeholder="e.g. 60000"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-lg font-semibold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        {/* Step 2: Payday / Salary Date */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              2. Salary Day of Month (Payday)
            </label>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              {salaryDay}th of every month
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Defines your monthly budget cycle start and end dates
          </p>
          
          <div className="grid grid-cols-5 gap-2 mb-2">
            {[1, 5, 10, 25, 30].map(day => (
              <button
                key={day}
                type="button"
                onClick={() => setSalaryDay(day)}
                className={`py-2 text-sm font-semibold rounded-xl border transition ${
                  salaryDay === day
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {day}th
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400 flex justify-between pt-1">
            <span>Next salary: <strong className="text-slate-200">{formatDisplayDate(cycle.nextSalaryMs)}</strong></span>
            <span className="text-emerald-400 font-semibold">{cycle.daysRemaining} days remaining</span>
          </div>
        </div>

        {/* Step 3: Fixed Confirmed Expenses */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-bold text-slate-200">
              3. Fixed Confirmed Expenses
            </label>
            <span className="text-xs font-bold text-slate-300">
              Total: <strong className="text-emerald-400">{formatCurrency(totalFixed)}</strong>
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Mandatory monthly deductions (Rent, Loan EMI, Insurance, WiFi)
          </p>

          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
            {fixedExpenses.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-200">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-300">{formatCurrency(item.amount)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFixed(item.id)}
                    className="text-slate-500 hover:text-rose-400 transition p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add custom fixed expense */}
          <form onSubmit={handleAddFixed} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. WiFi Bill"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="relative w-28">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
              <input
                type="number"
                placeholder="Amount"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-6 pr-2 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={!newLabel.trim() || !newAmount}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl px-3 flex items-center justify-center transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Live Calculation Preview Hero */}
        <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            Auto-Calculated Budget Math
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-400 block">Available Balance</span>
              <span className="text-2xl font-black text-white block tracking-tight">
                {formatCurrency(remainingBalance)}
              </span>
              <span className="text-[11px] text-slate-400">Salary − Fixed bills</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-xs text-emerald-400 block font-semibold">Fair Daily Limit</span>
              <span className="text-2xl font-black text-emerald-400 block tracking-tight">
                {formatCurrency(fairDailyBudget)}<span className="text-xs font-normal text-emerald-400/80">/day</span>
              </span>
              <span className="text-[11px] text-slate-400">{cycle.daysRemaining} days until payday</span>
            </div>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="pt-6 pb-2">
        <button
          type="button"
          disabled={numSalary <= 0}
          onClick={() => onComplete(numSalary, salaryDay, fixedExpenses)}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 text-base shadow-lg shadow-emerald-600/25 transition transform active:scale-[0.99]"
        >
          Start Living Within Budget
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
