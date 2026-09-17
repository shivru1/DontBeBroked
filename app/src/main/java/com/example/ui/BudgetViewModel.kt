package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.ai.AdvisorEngine
import com.example.data.local.AppDatabase
import com.example.data.local.ChatMessageEntity
import com.example.data.local.ExpenseLogEntity
import com.example.data.local.FixedExpenseEntity
import com.example.data.local.UserProfileEntity
import com.example.data.repository.BudgetRepository
import com.example.domain.BudgetCalculator
import com.example.domain.ExpenseParser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class BudgetUiState(
    val userProfile: UserProfileEntity? = null,
    val fixedExpenses: List<FixedExpenseEntity> = emptyList(),
    val expenseLogs: List<ExpenseLogEntity> = emptyList(),
    val chatMessages: List<ChatMessageEntity> = emptyList(),
    val totalFixedExpenses: Double = 0.0,
    val daysRemaining: Int = 1,
    val cycleStartDateMillis: Long = 0L,
    val nextSalaryDateMillis: Long = 0L,
    val totalVariableSpentInCycle: Double = 0.0,
    val remainingBalance: Double = 0.0,
    val fairDailyBudget: Double = 0.0,
    val todaySpent: Double = 0.0,
    val isTodayOverBudget: Boolean = false,
    val isAiThinking: Boolean = false,
    val isSetupCompleted: Boolean = false
)

class BudgetViewModel(
    application: Application,
    private val repository: BudgetRepository = BudgetRepository(AppDatabase.getInstance(application).budgetDao())
) : AndroidViewModel(application) {

    private val isAiThinkingFlow = MutableStateFlow(false)

    val uiState: StateFlow<BudgetUiState> = combine(
        repository.userProfileFlow,
        repository.fixedExpensesFlow,
        repository.allExpenseLogsFlow,
        repository.chatMessagesFlow,
        isAiThinkingFlow
    ) { profile, fixedExpenses, allLogs, messages, isAiThinking ->
        val salaryDay = profile?.salaryDayOfMonth ?: 1
        val monthlySalary = profile?.monthlySalary ?: 0.0
        val isSetup = profile?.isSetupCompleted ?: false

        val cycle = BudgetCalculator.calculateCycle(salaryDay)
        val totalFixed = fixedExpenses.sumOf { it.amount }

        // Variable expenses logged in the current cycle
        val cycleLogs = allLogs.filter { it.timestamp >= cycle.cycleStartMillis }
        val totalVariableSpent = cycleLogs.sumOf { it.amount }

        // Remaining balance = Monthly salary - fixed expenses - variable expenses this cycle
        val remaining = monthlySalary - totalFixed - totalVariableSpent
        val fairDailyBudget = BudgetCalculator.computeFairDailyBudget(remaining, cycle.daysRemaining)

        // Today's spending
        val todayKey = BudgetCalculator.getTodayDateKey()
        val todayLogs = allLogs.filter { it.dateKey == todayKey }
        val todaySpent = todayLogs.sumOf { it.amount }
        val isOverBudget = todaySpent > fairDailyBudget

        BudgetUiState(
            userProfile = profile,
            fixedExpenses = fixedExpenses,
            expenseLogs = allLogs,
            chatMessages = messages,
            totalFixedExpenses = totalFixed,
            daysRemaining = cycle.daysRemaining,
            cycleStartDateMillis = cycle.cycleStartMillis,
            nextSalaryDateMillis = cycle.nextSalaryMillis,
            totalVariableSpentInCycle = totalVariableSpent,
            remainingBalance = remaining,
            fairDailyBudget = fairDailyBudget,
            todaySpent = todaySpent,
            isTodayOverBudget = isOverBudget,
            isAiThinking = isAiThinking,
            isSetupCompleted = isSetup
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = BudgetUiState()
    )

    fun completeSetup(
        salary: Double,
        salaryDay: Int,
        fixedExpensesList: List<Pair<String, Double>>
    ) {
        viewModelScope.launch {
            val profile = UserProfileEntity(
                id = 1,
                monthlySalary = salary,
                salaryDayOfMonth = salaryDay.coerceIn(1, 31),
                currencySymbol = "₹",
                isSetupCompleted = true
            )
            repository.saveUserProfile(profile)

            for ((label, amount) in fixedExpensesList) {
                if (label.isNotBlank() && amount > 0) {
                    repository.addFixedExpense(label.trim(), amount)
                }
            }

            // Add initial welcome chat message from the AI Advisor
            val cycle = BudgetCalculator.calculateCycle(salaryDay)
            val totalFixed = fixedExpensesList.sumOf { it.second }
            val netStart = salary - totalFixed
            val fairBudget = BudgetCalculator.computeFairDailyBudget(netStart, cycle.daysRemaining)

            val welcomeText = "Hey! I'm your DontBeBroke advisor. After your ₹${totalFixed.toInt()} fixed expenses, you have ₹${netStart.toInt()} left for this month. With ${cycle.daysRemaining} days until payday, your fair spending limit is ₹${fairBudget.toInt()}/day. Whenever you spend, just tell me (e.g., 'Spent ₹450 on lunch') and I'll keep your math balanced!"

            repository.addChatMessage(
                ChatMessageEntity(
                    sender = "ADVISOR",
                    text = welcomeText,
                    timestamp = System.currentTimeMillis()
                )
            )
        }
    }

    fun addFixedExpense(label: String, amount: Double) {
        viewModelScope.launch {
            if (label.isNotBlank() && amount > 0) {
                repository.addFixedExpense(label.trim(), amount)
            }
        }
    }

    fun deleteFixedExpense(id: Long) {
        viewModelScope.launch {
            repository.deleteFixedExpense(id)
        }
    }

    fun updateProfile(salary: Double, salaryDay: Int) {
        viewModelScope.launch {
            val current = repository.getUserProfile() ?: UserProfileEntity()
            repository.saveUserProfile(
                current.copy(
                    monthlySalary = salary,
                    salaryDayOfMonth = salaryDay.coerceIn(1, 31)
                )
            )
        }
    }

    fun logExpense(amount: Double, note: String) {
        if (amount <= 0) return
        viewModelScope.launch {
            val state = uiState.value
            val previousFairBudget = state.fairDailyBudget
            val remainingAfter = state.remainingBalance - amount
            val daysRemaining = state.daysRemaining
            val currency = state.userProfile?.currencySymbol ?: "₹"
            val effectiveNote = if (note.isBlank()) "Daily Expense" else note.trim()
            val todaySpentAfter = state.todaySpent + amount
            val wasWithin = todaySpentAfter <= previousFairBudget

            // Save expense log
            repository.logExpense(
                ExpenseLogEntity(
                    amount = amount,
                    note = effectiveNote,
                    timestamp = System.currentTimeMillis(),
                    dateKey = BudgetCalculator.getTodayDateKey(),
                    fairDailyBudgetAtTime = previousFairBudget,
                    daysRemainingAtTime = daysRemaining,
                    remainingBalanceAfter = remainingAfter,
                    wasWithinBudget = wasWithin
                )
            )

            // Add user log message to chat
            val userMsg = "Logged: $currency${BudgetCalculator.formatCurrency(amount, "")} ($effectiveNote)"
            repository.addChatMessage(
                ChatMessageEntity(
                    sender = "USER",
                    text = userMsg,
                    timestamp = System.currentTimeMillis(),
                    isExpenseNotification = true
                )
            )

            // Trigger AI advisor response
            isAiThinkingFlow.value = true
            val advisorFeedback = AdvisorEngine.generateExpenseResponse(
                currencySymbol = currency,
                amountSpent = amount,
                note = effectiveNote,
                previousFairDailyBudget = previousFairBudget,
                remainingBalanceAfter = remainingAfter,
                daysRemaining = daysRemaining,
                totalSpentToday = todaySpentAfter
            )
            isAiThinkingFlow.value = false

            repository.addChatMessage(
                ChatMessageEntity(
                    sender = "ADVISOR",
                    text = advisorFeedback,
                    timestamp = System.currentTimeMillis() + 10,
                    isExpenseNotification = true,
                    isAlert = remainingAfter < 0 || todaySpentAfter > previousFairBudget
                )
            )
        }
    }

    fun logExpenseFromText(input: String) {
        val parsed = ExpenseParser.parse(input)
        if (parsed.amount != null && parsed.amount > 0) {
            logExpense(parsed.amount, parsed.note)
        }
    }

    fun sendChatMessage(messageText: String) {
        val text = messageText.trim()
        if (text.isEmpty()) return

        // Check if the user message is an expense command like "I spent 450"
        val parsed = ExpenseParser.parse(text)
        if (parsed.amount != null && parsed.amount > 0 && (
            text.contains("spent", ignoreCase = true) ||
            text.contains("paid", ignoreCase = true) ||
            text.contains("bought", ignoreCase = true) ||
            text.startsWith("₹") ||
            text.matches(Regex("""^(?:₹|Rs\.?)?\s*\d+(?:\.\d+)?\s*.*$"""))
        )) {
            logExpense(parsed.amount, parsed.note)
            return
        }

        viewModelScope.launch {
            val state = uiState.value
            val currency = state.userProfile?.currencySymbol ?: "₹"

            // Add user message
            repository.addChatMessage(
                ChatMessageEntity(
                    sender = "USER",
                    text = text,
                    timestamp = System.currentTimeMillis()
                )
            )

            // Generate AI response
            isAiThinkingFlow.value = true
            val advice = AdvisorEngine.generateChatAdvice(
                userMessage = text,
                currencySymbol = currency,
                monthlySalary = state.userProfile?.monthlySalary ?: 0.0,
                totalFixedExpenses = state.totalFixedExpenses,
                remainingBalance = state.remainingBalance,
                fairDailyBudget = state.fairDailyBudget,
                daysRemaining = state.daysRemaining,
                todaySpent = state.todaySpent
            )
            isAiThinkingFlow.value = false

            repository.addChatMessage(
                ChatMessageEntity(
                    sender = "ADVISOR",
                    text = advice,
                    timestamp = System.currentTimeMillis() + 10
                )
            )
        }
    }

    fun deleteExpenseLog(id: Long) {
        viewModelScope.launch {
            repository.deleteExpenseLog(id)
        }
    }

    fun clearChat() {
        viewModelScope.launch {
            repository.clearChat()
        }
    }

    fun resetAllData() {
        viewModelScope.launch {
            repository.resetAllData()
        }
    }

    companion object {
        fun provideFactory(application: Application): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return BudgetViewModel(application) as T
                }
            }
    }
}
