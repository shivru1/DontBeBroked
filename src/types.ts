export interface UserProfile {
  monthlySalary: number;
  salaryDay: number; // 1-31
  currencySymbol: string;
  isSetupCompleted: boolean;
  manualBalance?: number | null; // User's manual/actual bank balance override
  manualBalanceSetAt?: number | null; // Timestamp when manual balance was set
}

export interface FixedExpense {
  id: string;
  label: string;
  amount: number;
}

export interface ExpenseLog {
  id: string;
  amount: number;
  note: string;
  timestamp: number;
  dateKey: string; // "YYYY-MM-DD"
  fairDailyBudgetAtTime: number;
  daysRemainingAtTime: number;
  remainingBalanceAfter: number;
  wasWithinBudget: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'advisor';
  text: string;
  timestamp: number;
  isExpenseNotification?: boolean;
  isAlert?: boolean;
}

export interface CycleInfo {
  cycleStartMs: number;
  nextSalaryMs: number;
  daysRemaining: number;
}
