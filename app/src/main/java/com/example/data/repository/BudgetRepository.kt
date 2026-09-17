package com.example.data.repository

import com.example.data.local.BudgetDao
import com.example.data.local.ChatMessageEntity
import com.example.data.local.ExpenseLogEntity
import com.example.data.local.FixedExpenseEntity
import com.example.data.local.UserProfileEntity
import kotlinx.coroutines.flow.Flow

class BudgetRepository(private val dao: BudgetDao) {

    val userProfileFlow: Flow<UserProfileEntity?> = dao.getUserProfileFlow()
    val fixedExpensesFlow: Flow<List<FixedExpenseEntity>> = dao.getFixedExpensesFlow()
    val allExpenseLogsFlow: Flow<List<ExpenseLogEntity>> = dao.getAllExpenseLogsFlow()
    val chatMessagesFlow: Flow<List<ChatMessageEntity>> = dao.getAllChatMessagesFlow()

    suspend fun getUserProfile(): UserProfileEntity? = dao.getUserProfile()

    suspend fun saveUserProfile(profile: UserProfileEntity) {
        dao.upsertUserProfile(profile)
    }

    suspend fun getFixedExpenses(): List<FixedExpenseEntity> = dao.getFixedExpenses()

    suspend fun addFixedExpense(label: String, amount: Double): Long {
        return dao.insertFixedExpense(FixedExpenseEntity(label = label.trim(), amount = amount))
    }

    suspend fun updateFixedExpense(expense: FixedExpenseEntity) {
        dao.updateFixedExpense(expense)
    }

    suspend fun deleteFixedExpense(id: Long) {
        dao.deleteFixedExpenseById(id)
    }

    suspend fun logExpense(expense: ExpenseLogEntity): Long {
        return dao.insertExpenseLog(expense)
    }

    suspend fun deleteExpenseLog(id: Long) {
        dao.deleteExpenseLogById(id)
    }

    suspend fun addChatMessage(message: ChatMessageEntity): Long {
        return dao.insertChatMessage(message)
    }

    suspend fun clearChat() {
        dao.clearChatMessages()
    }

    suspend fun resetAllData() {
        dao.clearAllExpenseLogs()
        dao.clearChatMessages()
        dao.upsertUserProfile(
            UserProfileEntity(
                id = 1,
                monthlySalary = 0.0,
                salaryDayOfMonth = 1,
                currencySymbol = "₹",
                isSetupCompleted = false
            )
        )
    }
}
