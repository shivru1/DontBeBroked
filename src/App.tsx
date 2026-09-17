import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  BarChart2,
  Settings,
  Wifi,
  BatteryCharging
} from 'lucide-react';
import { SetupView } from './components/SetupView';
import { DashboardView } from './components/DashboardView';
import { AdvisorChatView } from './components/AdvisorChatView';
import { HistoryView } from './components/HistoryView';
import { LogExpenseModal } from './components/LogExpenseModal';
import { SettingsModal } from './components/SettingsModal';
import { AdjustBalanceModal } from './components/AdjustBalanceModal';
import {
  loadProfile,
  saveProfile,
  loadFixedExpenses,
  saveFixedExpenses,
  loadExpenseLogs,
  saveExpenseLogs,
  loadChatMessages,
  saveChatMessages,
  clearAllStorage,
  defaultProfile,
  defaultFixedExpenses
} from './utils/storage';
import { calculateCycle, computeFairDailyBudget, getTodayKey, formatCurrency } from './utils/calculator';
import { parseExpenseInput } from './utils/parser';
import { generateExpenseAdvisorFeedback, generateChatAdvice } from './services/advisorEngine';
import { UserProfile, FixedExpense, ExpenseLog, ChatMessage } from './types';

export const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(loadProfile);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(loadFixedExpenses);
  const [expenseLogs, setExpenseLogs] = useState<ExpenseLog[]>(loadExpenseLogs);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(loadChatMessages);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'history'>('dashboard');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAdjustBalanceModalOpen, setIsAdjustBalanceModalOpen] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Sync to storage on change
  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveFixedExpenses(fixedExpenses);
  }, [fixedExpenses]);

  useEffect(() => {
    saveExpenseLogs(expenseLogs);
  }, [expenseLogs]);

  useEffect(() => {
    saveChatMessages(chatMessages);
  }, [chatMessages]);

  // Derived budget math
  const cycle = useMemo(() => {
    return calculateCycle(profile.salaryDay);
  }, [profile.salaryDay]);

  const totalFixedExpenses = useMemo(() => {
    return fixedExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [fixedExpenses]);

  // Variable expenses in current salary cycle
  const currentCycleLogs = useMemo(() => {
    return expenseLogs.filter(log => log.timestamp >= cycle.cycleStartMs);
  }, [expenseLogs, cycle.cycleStartMs]);

  const totalVariableSpentInCycle = useMemo(() => {
    return currentCycleLogs.reduce((sum, log) => sum + log.amount, 0);
  }, [currentCycleLogs]);

  // Calculated auto balance vs manual balance override
  const autoCalculatedBalance = useMemo(() => {
    return profile.monthlySalary - totalFixedExpenses - totalVariableSpentInCycle;
  }, [profile.monthlySalary, totalFixedExpenses, totalVariableSpentInCycle]);

  const remainingBalance = useMemo(() => {
    if (profile.manualBalance != null && profile.manualBalanceSetAt != null) {
      // User manually set their current balance to X at timestamp T.
      // Any variable expense logged AFTER T deducts from this manual balance.
      const expensesAfterAdjustment = expenseLogs
        .filter(log => log.timestamp > profile.manualBalanceSetAt!)
        .reduce((sum, log) => sum + log.amount, 0);
      return profile.manualBalance - expensesAfterAdjustment;
    }
    return autoCalculatedBalance;
  }, [profile.manualBalance, profile.manualBalanceSetAt, expenseLogs, autoCalculatedBalance]);

  const fairDailyBudget = useMemo(() => {
    return computeFairDailyBudget(remainingBalance, cycle.daysRemaining);
  }, [remainingBalance, cycle.daysRemaining]);

  const todayKey = getTodayKey();
  const todaySpent = useMemo(() => {
    return expenseLogs
      .filter(log => log.dateKey === todayKey)
      .reduce((sum, log) => sum + log.amount, 0);
  }, [expenseLogs, todayKey]);

  // Complete Setup
  const handleCompleteSetup = (salary: number, salaryDay: number, fixed: FixedExpense[]) => {
    const newProfile: UserProfile = {
      ...profile,
      monthlySalary: salary,
      salaryDay: salaryDay,
      isSetupCompleted: true
    };
    setProfile(newProfile);
    setFixedExpenses(fixed);

    // Initial greeting from AI advisor
    const initialCycle = calculateCycle(salaryDay);
    const fixedTotal = fixed.reduce((s, e) => s + e.amount, 0);
    const bal = salary - fixedTotal;
    const daily = computeFairDailyBudget(bal, initialCycle.daysRemaining);

    const welcomeMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'advisor',
      text: `Hey! I'm your DontBeBroke AI budget advisor. After your fixed bills (${profile.currencySymbol}${fixedTotal}), you have ${profile.currencySymbol}${bal} to last ${initialCycle.daysRemaining} days. That's a fair daily limit of ${profile.currencySymbol}${daily}/day. You can log expenses here, or tap "Edit Balance" anytime your bank account balance changes!`,
      timestamp: Date.now()
    };
    setChatMessages([welcomeMsg]);
  };

  // Update Current Balance
  const handleUpdateCurrentBalance = (newBalance: number, notifyInChat: boolean = true) => {
    // Remove any accidental past expense log where user typed balance/add or note contains "balance" or "add"
    setExpenseLogs(prev => prev.filter(log => {
      const n = log.note.toLowerCase();
      return !n.includes('balance') && n !== 'add' && !n.startsWith('add ');
    }));

    const updatedProfile: UserProfile = {
      ...profile,
      manualBalance: newBalance,
      manualBalanceSetAt: Date.now()
    };
    setProfile(updatedProfile);

    if (notifyInChat) {
      const newDaily = computeFairDailyBudget(newBalance, cycle.daysRemaining);
      const advisorNotice: ChatMessage = {
        id: `${Date.now()}-advisor-bal`,
        sender: 'advisor',
        text: `Current balance set to ${formatCurrency(newBalance, profile.currencySymbol)}. With ${cycle.daysRemaining} days remaining until payday, your new fair daily limit is ${formatCurrency(newDaily, profile.currencySymbol)}/day. Future spends will be deducted from this balance!`,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, advisorNotice]);
    }
  };

  const handleRevertToCalculatedBalance = () => {
    setProfile(prev => ({
      ...prev,
      manualBalance: null,
      manualBalanceSetAt: null
    }));
  };

  // Log Expense Handler
  const handleLogExpense = async (amount: number, note: string) => {
    const currentBudget = fairDailyBudget;
    const isWithinBudget = amount <= (currentBudget > 0 ? currentBudget : 0);
    const newBalanceAfter = remainingBalance - amount;
    const dateKey = getTodayKey();

    const newLog: ExpenseLog = {
      id: Date.now().toString(),
      amount,
      note,
      timestamp: Date.now(),
      dateKey,
      fairDailyBudgetAtTime: currentBudget,
      daysRemainingAtTime: cycle.daysRemaining,
      remainingBalanceAfter: newBalanceAfter,
      wasWithinBudget: isWithinBudget
    };

    setExpenseLogs(prev => [newLog, ...prev]);

    // Add user note to chat
    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      sender: 'user',
      text: `Logged: ${profile.currencySymbol}${amount} for ${note}`,
      timestamp: Date.now(),
      isExpenseNotification: true
    };
    setChatMessages(prev => [...prev, userMsg]);

    // Request AI Advisor feedback
    setIsAiThinking(true);
    try {
      const feedback = await generateExpenseAdvisorFeedback({
        currencySymbol: profile.currencySymbol,
        amountSpent: amount,
        note,
        previousFairDailyBudget: currentBudget,
        remainingBalanceAfter: newBalanceAfter,
        daysRemaining: cycle.daysRemaining,
        totalSpentToday: todaySpent + amount
      });

      const advisorMsg: ChatMessage = {
        id: `${Date.now()}-advisor`,
        sender: 'advisor',
        text: feedback,
        timestamp: Date.now() + 50,
        isAlert: newBalanceAfter < 0 || (todaySpent + amount) > currentBudget
      };
      setChatMessages(prev => [...prev, advisorMsg]);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Quick Text Input (Chat style: "Spent ₹450 on lunch" OR "my balance is 12000" OR "add 2000")
  const handleQuickLog = (text: string) => {
    const parsed = parseExpenseInput(text);

    // Intent 1: Balance update ("my balance is 12000" OR "add 2000" OR "deduct 500")
    if (parsed.isBalanceUpdate && parsed.amount != null) {
      const targetBalance = parsed.balanceAction === 'add'
        ? remainingBalance + parsed.amount
        : parsed.balanceAction === 'subtract'
          ? remainingBalance - parsed.amount
          : parsed.amount;

      handleUpdateCurrentBalance(targetBalance, true);
      return;
    }

    // Intent 2: Salary update ("my salary is 60000")
    if (parsed.isSalaryUpdate && parsed.amount != null) {
      setProfile(p => ({ ...p, monthlySalary: parsed.amount! }));
      return;
    }

    // Intent 3: Balance query ("what is my balance")
    if (parsed.isBalanceQuery) {
      handleSendChatMessage(text);
      setActiveTab('chat');
      return;
    }

    // Intent 4: Actual Expense Spend
    if (parsed.amount && parsed.amount > 0 && !parsed.isBalanceUpdate && !parsed.isSalaryUpdate) {
      handleLogExpense(parsed.amount, parsed.note);
    } else {
      // Treat as conversational query to the AI advisor
      handleSendChatMessage(text);
      setActiveTab('chat');
    }
  };

  // Chat message submission
  const handleSendChatMessage = async (text: string) => {
    const parsed = parseExpenseInput(text);

    // If user states or modifies their balance in chat ("add 2000", "my balance is 9000", etc.):
    if (parsed.isBalanceUpdate && parsed.amount != null) {
      const targetBalance = parsed.balanceAction === 'add'
        ? remainingBalance + parsed.amount
        : parsed.balanceAction === 'subtract'
          ? remainingBalance - parsed.amount
          : parsed.amount;

      handleUpdateCurrentBalance(targetBalance, false);
      const userMsg: ChatMessage = {
        id: `${Date.now()}-user`,
        sender: 'user',
        text,
        timestamp: Date.now()
      };
      const newDaily = computeFairDailyBudget(targetBalance, cycle.daysRemaining);

      const actionDesc = parsed.balanceAction === 'add'
        ? `I've updated your numbers! Adding ${formatCurrency(parsed.amount, profile.currencySymbol)} brings your current remaining balance up to ${formatCurrency(targetBalance, profile.currencySymbol)}.`
        : parsed.balanceAction === 'subtract'
          ? `Deducted ${formatCurrency(parsed.amount, profile.currencySymbol)}. Your remaining balance is now ${formatCurrency(targetBalance, profile.currencySymbol)}.`
          : `Got it! I've updated your current balance to ${formatCurrency(targetBalance, profile.currencySymbol)}.`;

      const advisorMsg: ChatMessage = {
        id: `${Date.now()}-advisor`,
        sender: 'advisor',
        text: `${actionDesc} With ${cycle.daysRemaining} days left until payday, your new fair daily budget is about **${formatCurrency(newDaily, profile.currencySymbol)}/day**.`,
        timestamp: Date.now() + 50
      };
      setChatMessages(prev => [...prev, userMsg, advisorMsg]);
      return;
    }

    // If user explicitly asks to log spend in chat:
    if (parsed.amount && parsed.amount > 0 && !parsed.isBalanceUpdate && (
      text.toLowerCase().includes('spent') ||
      text.toLowerCase().includes('paid') ||
      text.toLowerCase().includes('bought')
    )) {
      handleLogExpense(parsed.amount, parsed.note);
      return;
    }

    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      sender: 'user',
      text,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, userMsg]);

    setIsAiThinking(true);
    try {
      const advice = await generateChatAdvice({
        userMessage: text,
        currencySymbol: profile.currencySymbol,
        monthlySalary: profile.monthlySalary,
        totalFixedExpenses,
        remainingBalance,
        fairDailyBudget,
        daysRemaining: cycle.daysRemaining,
        todaySpent
      });

      let cleanAdvice = advice;

      // Check if Gemini or fallback requested setting an exact balance
      const setBalMatch = advice.match(/\[ACTION:SET_BALANCE:(\d+(?:\.\d+)?)\]/i);
      if (setBalMatch && setBalMatch[1]) {
        const newBal = parseFloat(setBalMatch[1]);
        if (!isNaN(newBal)) {
          handleUpdateCurrentBalance(newBal, false);
        }
        cleanAdvice = cleanAdvice.replace(/\[ACTION:SET_BALANCE:\d+(?:\.\d+)?\]/gi, '').trim();
      }

      // Check if Gemini or fallback requested adjusting by delta
      const deltaMatch = advice.match(/\[ACTION:ADJUST_BALANCE:([+-]?\d+(?:\.\d+)?)\]/i);
      if (deltaMatch && deltaMatch[1]) {
        const delta = parseFloat(deltaMatch[1]);
        if (!isNaN(delta)) {
          handleUpdateCurrentBalance(remainingBalance + delta, false);
        }
        cleanAdvice = cleanAdvice.replace(/\[ACTION:ADJUST_BALANCE:[+-]?\d+(?:\.\d+)?\]/gi, '').trim();
      }

      const advisorMsg: ChatMessage = {
        id: `${Date.now()}-advisor`,
        sender: 'advisor',
        text: cleanAdvice,
        timestamp: Date.now() + 50
      };
      setChatMessages(prev => [...prev, advisorMsg]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleDeleteExpenseLog = (id: string) => {
    setExpenseLogs(prev => prev.filter(item => item.id !== id));
  };

  const handleResetAll = () => {
    clearAllStorage();
    setProfile(defaultProfile);
    setFixedExpenses(defaultFixedExpenses);
    setExpenseLogs([]);
    setChatMessages([]);
    setActiveTab('dashboard');
  };

  // If initial setup is not yet completed, show Setup Screen
  if (!profile.isSetupCompleted) {
    return <SetupView onComplete={handleCompleteSetup} />;
  }

  const latestAdvisorMessage = chatMessages.slice().reverse().find(m => m.sender === 'advisor');

  return (
    <div className="h-screen h-[100dvh] bg-slate-950 text-slate-100 flex justify-center overflow-hidden">
      {/* Mobile Shell Wrapper */}
      <div className="w-full max-w-md h-full h-[100dvh] max-h-[100dvh] flex flex-col bg-slate-950 border-x border-slate-900 shadow-2xl relative overflow-hidden">
        {/* Native Android Status Bar */}
        <div className="h-7 bg-slate-950 px-5 flex items-center justify-between text-[11px] font-bold text-slate-400 select-none border-b border-slate-900/60 shrink-0">
          <span>9:41</span>
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[10px] text-emerald-400 font-black">5G</span>
            <div className="flex items-center gap-0.5">
              <span className="text-[10px]">85%</span>
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="ml-2 p-1 text-slate-400 hover:text-white transition"
              title="Budget Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Content View */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              profile={profile}
              remainingBalance={remainingBalance}
              fairDailyBudget={fairDailyBudget}
              daysRemaining={cycle.daysRemaining}
              nextSalaryMs={cycle.nextSalaryMs}
              totalFixedExpenses={totalFixedExpenses}
              totalVariableSpent={totalVariableSpentInCycle}
              todaySpent={todaySpent}
              recentLogs={expenseLogs}
              latestAdvisorMessage={latestAdvisorMessage}
              onOpenLogModal={() => setIsLogModalOpen(true)}
              onOpenAdjustBalance={() => setIsAdjustBalanceModalOpen(true)}
              onQuickLog={handleQuickLog}
              onNavigateToChat={() => setActiveTab('chat')}
              onNavigateToHistory={() => setActiveTab('history')}
            />
          )}

          {activeTab === 'chat' && (
            <AdvisorChatView
              profile={profile}
              messages={chatMessages}
              remainingBalance={remainingBalance}
              fairDailyBudget={fairDailyBudget}
              daysRemaining={cycle.daysRemaining}
              isAiThinking={isAiThinking}
              onSendMessage={handleSendChatMessage}
              onClearChat={() => setChatMessages([])}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              profile={profile}
              expenseLogs={expenseLogs}
              fairDailyBudget={fairDailyBudget}
              totalVariableSpent={totalVariableSpentInCycle}
              onDeleteLog={handleDeleteExpenseLog}
            />
          )}
        </div>

        {/* Android Bottom Navigation Bar */}
        <nav className="h-16 bg-slate-900/95 border-t border-slate-800/80 backdrop-blur px-6 flex items-center justify-around shrink-0 z-40">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px]">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 transition relative ${
              activeTab === 'chat' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px]">AI Advisor</span>
            {latestAdvisorMessage?.isAlert && (
              <span className="absolute top-0 right-3 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'history' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[10px]">History</span>
          </button>
        </nav>

        {/* Modal: Log Expense */}
        <LogExpenseModal
          isOpen={isLogModalOpen}
          currencySymbol={profile.currencySymbol}
          currentBalance={remainingBalance}
          fairDailyBudget={fairDailyBudget}
          daysRemaining={cycle.daysRemaining}
          onClose={() => setIsLogModalOpen(false)}
          onConfirm={handleLogExpense}
        />

        {/* Modal: Adjust Balance */}
        <AdjustBalanceModal
          isOpen={isAdjustBalanceModalOpen}
          currencySymbol={profile.currencySymbol}
          currentCalculatedBalance={autoCalculatedBalance}
          currentActualBalance={remainingBalance}
          isManualBalance={profile.manualBalance != null}
          daysRemaining={cycle.daysRemaining}
          onClose={() => setIsAdjustBalanceModalOpen(false)}
          onSaveBalance={handleUpdateCurrentBalance}
          onRevertToCalculated={handleRevertToCalculatedBalance}
        />

        {/* Modal: Settings */}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          profile={profile}
          fixedExpenses={fixedExpenses}
          remainingBalance={remainingBalance}
          onClose={() => setIsSettingsModalOpen(false)}
          onSaveProfile={(salary, salaryDay) => {
            setProfile(p => ({ ...p, monthlySalary: salary, salaryDay }));
            setIsSettingsModalOpen(false);
          }}
          onSaveCurrentBalance={handleUpdateCurrentBalance}
          onRevertToCalculatedBalance={handleRevertToCalculatedBalance}
          onAddFixedExpense={(label, amount) => {
            setFixedExpenses(prev => [...prev, { id: Date.now().toString(), label, amount }]);
          }}
          onRemoveFixedExpense={id => {
            setFixedExpenses(prev => prev.filter(e => e.id !== id));
          }}
          onResetAllData={handleResetAll}
        />
      </div>
    </div>
  );
};
export default App;
