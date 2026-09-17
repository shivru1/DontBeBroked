import { CycleInfo } from '../types';

export function getTodayKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric'
  });
}

export function formatCurrency(amount: number, symbol: string = '₹'): string {
  const isInteger = Math.round(amount) === amount;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: isInteger ? 0 : 2,
    minimumFractionDigits: isInteger ? 0 : 2
  }).format(Math.abs(amount));

  if (amount < 0) {
    return `-${symbol}${formatted}`;
  }
  return `${symbol}${formatted}`;
}

export function calculateCycle(salaryDay: number, nowMs: number = Date.now()): CycleInfo {
  const clampedDay = Math.max(1, Math.min(31, salaryDay));
  const now = new Date(nowMs);
  now.setHours(0, 0, 0, 0);

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const todayDate = now.getDate();

  // Helper to get max days in a given month
  const getMaxDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  let cycleStartDate: Date;
  let nextSalaryDate: Date;

  if (todayDate >= clampedDay) {
    // Current cycle started this month
    const maxDayThisMonth = getMaxDaysInMonth(currentYear, currentMonth);
    cycleStartDate = new Date(currentYear, currentMonth, Math.min(clampedDay, maxDayThisMonth));
    
    // Next salary is next month
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const maxDayNextMonth = getMaxDaysInMonth(nextMonthYear, nextMonth);
    nextSalaryDate = new Date(nextMonthYear, nextMonth, Math.min(clampedDay, maxDayNextMonth));
  } else {
    // Current cycle started last month
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const maxDayPrevMonth = getMaxDaysInMonth(prevMonthYear, prevMonth);
    cycleStartDate = new Date(prevMonthYear, prevMonth, Math.min(clampedDay, maxDayPrevMonth));

    // Next salary is this month
    const maxDayThisMonth = getMaxDaysInMonth(currentYear, currentMonth);
    nextSalaryDate = new Date(currentYear, currentMonth, Math.min(clampedDay, maxDayThisMonth));
  }

  const diffMs = nextSalaryDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(1, diffDays);

  return {
    cycleStartMs: cycleStartDate.getTime(),
    nextSalaryMs: nextSalaryDate.getTime(),
    daysRemaining
  };
}

export function computeFairDailyBudget(remainingBalance: number, daysRemaining: number): number {
  if (daysRemaining <= 0) return remainingBalance;
  return Math.round((remainingBalance / daysRemaining) * 100) / 100;
}
