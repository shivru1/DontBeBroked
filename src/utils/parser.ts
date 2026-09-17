export type BalanceActionType = 'set' | 'add' | 'subtract' | null;

export interface ParsedExpense {
  amount: number | null;
  note: string;
  isBalanceUpdate: boolean;
  balanceAction: BalanceActionType;
  isBalanceQuery: boolean;
  isSalaryUpdate: boolean;
}

export function parseExpenseInput(input: string): ParsedExpense {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      amount: null,
      note: '',
      isBalanceUpdate: false,
      balanceAction: null,
      isBalanceQuery: false,
      isSalaryUpdate: false
    };
  }

  const lower = trimmed.toLowerCase();

  // Affordability query check (e.g., "can I afford shoes for 1200")
  const isAffordabilityQuery = (
    lower.includes('afford') ||
    lower.includes('can i buy') ||
    lower.includes('can i spend') ||
    lower.includes('should i buy') ||
    lower.includes('should i spend') ||
    lower.includes('worth')
  );

  // Check if user is asking about balance
  const isBalanceQuery = !isAffordabilityQuery && (
    lower.includes('what is my balance') ||
    lower.includes("what's my balance") ||
    lower.includes('check balance') ||
    lower.includes('how much balance') ||
    lower.includes('how much is left') ||
    (lower.includes('remaining balance') && !lower.match(/\d+/))
  );

  // Check if user is stating salary
  const salaryPattern = /(?:my|monthly)?\s*salary\s*(?:is|to|:|=)?\s*(?:(?:₹|rs\.?|inr|\$)\s*)?\d+/i;
  const isSalaryUpdate = salaryPattern.test(lower) && !lower.includes('spent');

  // Find amount: matches numbers with optional +/-, currency prefix or suffix (₹, Rs, Rs., INR, $)
  const regex = /([+-]?\s*(?:(?:₹|Rs\.?|INR|\$)\s*)?[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[+-]?\s*[0-9]+\.[0-9]{1,2})(?:\s*(?:₹|Rs\.?|INR|\$))?/i;
  const match = trimmed.match(regex);

  if (!match || !match[1]) {
    return {
      amount: null,
      note: trimmed,
      isBalanceUpdate: false,
      balanceAction: null,
      isBalanceQuery,
      isSalaryUpdate
    };
  }

  const rawAmount = match[1].replace(/,/g, '').replace(/\s+/g, '');
  const parsedFloat = parseFloat(rawAmount);

  if (isNaN(parsedFloat)) {
    return {
      amount: null,
      note: trimmed,
      isBalanceUpdate: false,
      balanceAction: null,
      isBalanceQuery,
      isSalaryUpdate
    };
  }

  const amount = Math.abs(parsedFloat);
  const isSpentKeyword = lower.includes('spent') || lower.includes('paid') || lower.includes('bought');

  // Balance additions/deposits (e.g. "add 2000", "added 2000", "+2000", "received 2000")
  const isAddKeyword = !isAffordabilityQuery && !isSpentKeyword && (
    /^(?:\+|(?:please\s+)?(?:add|added|adding|deposit|deposited|credit|credited|received|got|increase))\b/i.test(lower) ||
    /\b(?:to|into)\s+(?:my\s+)?(?:balance|bank|account)\b/i.test(lower) ||
    lower.startsWith('+')
  );

  // Balance subtractions/deductions (e.g. "deduct 500 from balance", "-500 from balance")
  const isDeductKeyword = !isAffordabilityQuery && !isSpentKeyword && (
    /^(?:-|(?:please\s+)?(?:deduct|deducted|subtract|subtracted|reduce))\b/i.test(lower) ||
    /\bfrom\s+(?:my\s+)?(?:balance|bank|account)\b/i.test(lower) ||
    lower.startsWith('-')
  );

  // Absolute balance set pattern (e.g. "my balance is 9000", "balance 9000", "set balance to 9000")
  const balancePattern = /(?:(?:my|the|current|bank|account)\s+)?balance\s*(?:is|to|of|:|=)?\s*(?:(?:₹|rs\.?|inr|\$)\s*)?\d+|\b(?:i have|have got)\s*(?:(?:₹|rs\.?|inr|\$)\s*)?\d+.*?(?:in\s+(?:bank|account)|left)|(?:(?:₹|rs\.?|inr|\$)\s*)?\d+\s*(?:(?:in\s+)?(?:bank|account|balance))\b/i;

  let balanceAction: BalanceActionType = null;
  let isBalanceUpdate = false;

  if (!isAffordabilityQuery && !isBalanceQuery && !isSalaryUpdate) {
    if (isAddKeyword) {
      isBalanceUpdate = true;
      balanceAction = 'add';
    } else if (isDeductKeyword) {
      isBalanceUpdate = true;
      balanceAction = 'subtract';
    } else if (balancePattern.test(lower) || (
      (lower.includes('balance') || lower.includes('in bank') || lower.includes('in my account')) &&
      !isSpentKeyword
    )) {
      isBalanceUpdate = true;
      balanceAction = 'set';
    }
  }

  // If this is balance or salary intent, do NOT strip it as a spend item
  if (isBalanceUpdate || isSalaryUpdate || isBalanceQuery) {
    return {
      amount,
      note: trimmed,
      isBalanceUpdate,
      balanceAction,
      isBalanceQuery,
      isSalaryUpdate
    };
  }

  // Remove the matched amount and common spend keywords
  let remaining = trimmed.replace(match[0], ' ')
    .replace(/\b(i spent|spent|paid|bought|for|on|today|yesterday|rs\.?|inr|₹|\$)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!remaining) {
    remaining = 'Daily Expense';
  } else {
    remaining = remaining.charAt(0).toUpperCase() + remaining.slice(1);
  }

  return {
    amount,
    note: remaining,
    isBalanceUpdate: false,
    balanceAction: null,
    isBalanceQuery: false,
    isSalaryUpdate: false
  };
}
