import { UserProfile, FixedExpense, ExpenseLog, ChatMessage } from '../types';

const STORAGE_KEYS = {
  PROFILE: 'dontbebroke_profile',
  FIXED_EXPENSES: 'dontbebroke_fixed_expenses',
  EXPENSE_LOGS: 'dontbebroke_expense_logs',
  CHAT_MESSAGES: 'dontbebroke_chat_messages'
};

export const defaultProfile: UserProfile = {
  monthlySalary: 60000,
  salaryDay: 1,
  currencySymbol: '₹',
  isSetupCompleted: true
};

export const defaultFixedExpenses: FixedExpense[] = [
  { id: '1', label: 'Rent', amount: 15000 },
  { id: '2', label: 'Loan EMI', amount: 8000 },
  { id: '3', label: 'Insurance', amount: 2000 }
];

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load profile', e);
  }
  return defaultProfile;
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

export function loadFixedExpenses(): FixedExpense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FIXED_EXPENSES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load fixed expenses', e);
  }
  return defaultFixedExpenses;
}

export function saveFixedExpenses(expenses: FixedExpense[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FIXED_EXPENSES, JSON.stringify(expenses));
  } catch (e) {
    console.error('Failed to save fixed expenses', e);
  }
}

export function loadExpenseLogs(): ExpenseLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSE_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load expense logs', e);
  }
  return [];
}

export function saveExpenseLogs(logs: ExpenseLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSE_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save expense logs', e);
  }
}

export function loadChatMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load chat messages', e);
  }
  return [];
}

export function saveChatMessages(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save chat messages', e);
  }
}

export function clearAllStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
  localStorage.removeItem(STORAGE_KEYS.FIXED_EXPENSES);
  localStorage.removeItem(STORAGE_KEYS.EXPENSE_LOGS);
  localStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES);
}
