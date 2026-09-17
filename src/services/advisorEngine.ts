import { formatCurrency, computeFairDailyBudget } from '../utils/calculator';

interface ExpenseFeedbackParams {
  currencySymbol: string;
  amountSpent: number;
  note: string;
  previousFairDailyBudget: number;
  remainingBalanceAfter: number;
  daysRemaining: number;
  totalSpentToday: number;
}

interface ChatAdviceParams {
  userMessage: string;
  currencySymbol: string;
  monthlySalary: number;
  totalFixedExpenses: number;
  remainingBalance: number;
  fairDailyBudget: number;
  daysRemaining: number;
  todaySpent: number;
}

const GEMINI_API_KEY = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';

// Priority list of Gemini models for fast, reliable thinking & response
const CANDIDATE_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.5-flash',
  'gemini-flash-latest'
];

async function queryGemini(prompt: string, systemInstruction: string): Promise<string | null> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'MY_GEMINI_API_KEY' || GEMINI_API_KEY.length < 10) {
    return null;
  }

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [
            { parts: [{ text: prompt }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Parse candidate parts (skip internal thought parts if any, grab text)
        const parts = data?.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.text && part.text.trim()) {
            return part.text.trim();
          }
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`Gemini model ${model} returned ${res.status}:`, errText.slice(0, 150));
      }
    } catch (err) {
      console.warn(`Gemini query error on model ${model}:`, err);
    }
  }

  return null;
}

export async function generateExpenseAdvisorFeedback(params: ExpenseFeedbackParams): Promise<string> {
  const {
    currencySymbol,
    amountSpent,
    note,
    previousFairDailyBudget,
    remainingBalanceAfter,
    daysRemaining,
    totalSpentToday
  } = params;

  // Query live Gemini AI
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    const systemPrompt = `You are DontBeBroke's AI Financial Advisor powered by Gemini. You talk like a sharp, supportive friend doing real-time personal finance math. Be direct, punchy, and helpful. Always cite the exact numbers: what was logged, previous daily limit, remaining days, remaining balance, and new adjusted daily limit for tomorrow. Limit to 2-3 sentences.`;

    const userPrompt = `
      The user just logged an expense:
      - Spent: ${currencySymbol}${amountSpent} on "${note || 'Daily Expense'}"
      - Today's Total Spend so far: ${currencySymbol}${totalSpentToday}
      - Today's Fair Daily Budget was: ${currencySymbol}${previousFairDailyBudget}/day
      - Remaining Balance after this spend: ${currencySymbol}${remainingBalanceAfter}
      - Days left until payday: ${daysRemaining} days

      Provide financial advice:
      1. Was this within or above their fair daily budget?
      2. If over budget, calculate how this decreases their daily allowance for the remaining days.
      3. If they are in deficit (negative balance), give an urgent warning.
      4. If within budget, encourage them and state their new daily limit.
    `;

    const aiRes = await queryGemini(userPrompt, systemPrompt);
    if (aiRes) return aiRes;
  }

  // Fallback math engine
  return generateDeterministicExpenseFeedback(params);
}

function generateDeterministicExpenseFeedback(params: ExpenseFeedbackParams): string {
  const {
    currencySymbol,
    amountSpent,
    note,
    previousFairDailyBudget,
    remainingBalanceAfter,
    daysRemaining,
    totalSpentToday
  } = params;

  const spentFmt = formatCurrency(amountSpent, currencySymbol);
  const prevBudgetFmt = formatCurrency(previousFairDailyBudget, currencySymbol);
  const remainingFmt = formatCurrency(remainingBalanceAfter, currencySymbol);
  const noteSuffix = note && note !== 'Daily Expense' ? ` on ${note}` : '';

  if (remainingBalanceAfter < 0) {
    const deficit = formatCurrency(Math.abs(remainingBalanceAfter), currencySymbol);
    return `⚠️ Deficit Warning: You spent ${spentFmt}${noteSuffix}, pushing your balance to -${deficit} with ${daysRemaining} days left until payday. You're in overdraft. Freeze all discretionary spending immediately.`;
  }

  if (remainingBalanceAfter === 0) {
    return `⚠️ Zero Balance: That ${spentFmt} spend brought your remaining balance to ${currencySymbol}0 with ${daysRemaining} days to go. Every single remaining day requires ${currencySymbol}0 spending until your next salary hits.`;
  }

  if (daysRemaining <= 1) {
    if (totalSpentToday > previousFairDailyBudget) {
      return `Final stretch before payday! You spent ${spentFmt}${noteSuffix}, exceeding your ${prevBudgetFmt} target. You have ${remainingFmt} left to close out today.`;
    } else {
      return `Solid discipline! You spent ${spentFmt}${noteSuffix} today, well within your ${prevBudgetFmt} limit. You have ${remainingFmt} left to reach payday tomorrow.`;
    }
  }

  const futureDays = daysRemaining - 1;
  const newDailyLimit = computeFairDailyBudget(remainingBalanceAfter, futureDays);
  const newLimitFmt = formatCurrency(newDailyLimit, currencySymbol);

  if (totalSpentToday > previousFairDailyBudget) {
    const balanceBefore = remainingBalanceAfter + amountSpent;
    const balanceBeforeFmt = formatCurrency(balanceBefore, currencySymbol);

    return `You had ${balanceBeforeFmt} left with ${daysRemaining} days to go (${prevBudgetFmt}/day). You spent ${spentFmt} today${noteSuffix}, so tomorrow you only have ${remainingFmt} left across ${futureDays} days (${newLimitFmt}/day). Keep tomorrow extra lean!`;
  }

  return `Nice control! You spent ${spentFmt}${noteSuffix} today, safely within your ${prevBudgetFmt} daily limit. You now have ${remainingFmt} across ${daysRemaining} days, keeping your daily allowance balanced at ${newLimitFmt}/day.`;
}

export async function generateChatAdvice(params: ChatAdviceParams): Promise<string> {
  const {
    userMessage,
    currencySymbol,
    monthlySalary,
    totalFixedExpenses,
    remainingBalance,
    fairDailyBudget,
    daysRemaining,
    todaySpent
  } = params;

  // Query live Gemini AI
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    const systemPrompt = `You are DontBeBroke's AI Budget Advisor, powered by Google Gemini. You are a real AI assistant built into the app to help the user manage their money. 
Tone: Friendly, smart, direct, math-focused friend. Never robotic, preachy, or corporate. 
User's Financial Context:
- Monthly Salary: ${currencySymbol}${monthlySalary}
- Fixed Monthly Bills: ${currencySymbol}${totalFixedExpenses}
- Current Remaining Balance: ${currencySymbol}${remainingBalance}
- Days until next payday: ${daysRemaining} days
- Fair Daily Budget Target: ${currencySymbol}${fairDailyBudget}/day
- Spent Today so far: ${currencySymbol}${todaySpent}

Instructions:
- If the user asks if you are an AI or bot, proudly confirm you are their AI budget assistant powered by Gemini.
- If the user asks whether they can afford an item, calculate the exact impact on their remaining balance and their daily limit for remaining days.
- If the user asks to add money to their balance, received income/bonus, deposit money, or update/set their balance (e.g. 'add 2000', 'added 2000', 'received 2000', 'set balance to 9000', 'my balance is 9000'):
  1. Clearly explain how their balance and daily allowance change.
  2. Compute the exact new total balance number.
  3. Include an action tag at the very end of your response: [ACTION:SET_BALANCE:number] where number is the new total remaining balance integer (e.g. [ACTION:SET_BALANCE:9000]).
- Keep answers concise (2 to 4 sentences).`;

    const aiRes = await queryGemini(userMessage, systemPrompt);
    if (aiRes) return aiRes;
  }

  // Intelligent fallback responder
  const lower = userMessage.toLowerCase();
  const balanceFmt = formatCurrency(remainingBalance, currencySymbol);
  const budgetFmt = formatCurrency(fairDailyBudget, currencySymbol);
  const todaySpentFmt = formatCurrency(todaySpent, currencySymbol);

  // If user asks "is this an AI bot?"
  if (lower.includes('ai') || lower.includes('bot') || lower.includes('who are you') || lower.includes('are you human')) {
    return `Yes! I am your AI Financial Advisor in DontBeBroke, powered by Google Gemini. I continuously track your balance (${balanceFmt}), days to payday (${daysRemaining} days), and calculate your fair daily budget (${budgetFmt}/day) so you never run broke.`;
  }

  // Affordability analysis
  const numMatch = userMessage.match(/\b\d+(?:\.\d+)?\b/);
  const extractedAmount = numMatch ? parseFloat(numMatch[0]) : null;

  if (extractedAmount && (lower.includes('afford') || lower.includes('buy') || lower.includes('spend') || lower.includes('can i'))) {
    const costFmt = formatCurrency(extractedAmount, currencySymbol);
    if (extractedAmount > remainingBalance) {
      return `No, you cannot afford ${costFmt}. You only have ${balanceFmt} remaining for the next ${daysRemaining} days. Buying this immediately puts you into debt.`;
    }

    const leftover = remainingBalance - extractedAmount;
    const futureDays = Math.max(1, daysRemaining - 1);
    const newDaily = leftover / futureDays;
    const newDailyFmt = formatCurrency(newDaily, currencySymbol);

    if (extractedAmount > fairDailyBudget * 1.5) {
      return `Spending ${costFmt} today will hurt. Your fair daily limit is ${budgetFmt}. If you buy it, your remaining balance drops to ${formatCurrency(leftover, currencySymbol)}, leaving you with only ${newDailyFmt}/day for the next ${futureDays} days.`;
    } else {
      return `Yes, you can manage ${costFmt}. It leaves you with ${formatCurrency(leftover, currencySymbol)} over ${daysRemaining} days (${newDailyFmt}/day). Just keep the next couple of days lean.`;
    }
  }

  // Fallback balance adjustment support
  if (extractedAmount && (lower.includes('add') || lower.includes('deposit') || lower.includes('received') || lower.includes('credit') || lower.startsWith('+'))) {
    const newBal = remainingBalance + extractedAmount;
    const newDaily = computeFairDailyBudget(newBal, daysRemaining);
    return `Adding ${formatCurrency(extractedAmount, currencySymbol)} brings your current remaining balance up to ${formatCurrency(newBal, currencySymbol)}. With ${daysRemaining} days left until payday, your new fair daily budget jumps to ${formatCurrency(newDaily, currencySymbol)}/day. [ACTION:SET_BALANCE:${newBal}]`;
  }

  if (extractedAmount && (lower.includes('set balance') || lower.includes('update balance') || lower.includes('balance is'))) {
    const newDaily = computeFairDailyBudget(extractedAmount, daysRemaining);
    return `Updated your current balance to ${formatCurrency(extractedAmount, currencySymbol)}. With ${daysRemaining} days left until payday, your new fair daily budget is ${formatCurrency(newDaily, currencySymbol)}/day. [ACTION:SET_BALANCE:${extractedAmount}]`;
  }

  if (lower.includes('balance') || lower.includes('how much do i have')) {
    return `Your current remaining balance is ${balanceFmt}. With ${daysRemaining} days left until payday, you have a fair daily limit of ${budgetFmt}/day. You can also tap "Adjust Balance" on your dashboard anytime to update this!`;
  }

  if (lower.includes('status') || lower.includes('how am i doing') || lower.includes('summary')) {
    return `Financial status: You have ${balanceFmt} remaining across ${daysRemaining} days until payday (${budgetFmt}/day). You've spent ${todaySpentFmt} today so far.`;
  }

  if (lower.includes('tip') || lower.includes('save') || lower.includes('broke') || lower.includes('help')) {
    return `Here are 3 rules to stay afloat: 1) Cap today's total spending at ${budgetFmt}. 2) Postpone non-essential Amazon/online orders until salary day. 3) Cook or eat what's already at home.`;
  }

  return `You have ${balanceFmt} left across ${daysRemaining} days (${budgetFmt}/day). Ask me anything about your budget, or let me know anytime you want to adjust your balance or check if you can afford a purchase!`;
}
