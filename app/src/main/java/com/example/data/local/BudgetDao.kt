package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import androidx.room.Delete
import kotlinx.coroutines.flow.Flow

@Dao
interface BudgetDao {

    // User Profile
    @Query("SELECT * FROM user_profile WHERE id = 1 LIMIT 1")
    fun getUserProfileFlow(): Flow<UserProfileEntity?>

    @Query("SELECT * FROM user_profile WHERE id = 1 LIMIT 1")
    suspend fun getUserProfile(): UserProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertUserProfile(profile: UserProfileEntity)

    // Fixed Expenses
    @Query("SELECT * FROM fixed_expenses ORDER BY id ASC")
    fun getFixedExpensesFlow(): Flow<List<FixedExpenseEntity>>

    @Query("SELECT * FROM fixed_expenses ORDER BY id ASC")
    suspend fun getFixedExpenses(): List<FixedExpenseEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFixedExpense(expense: FixedExpenseEntity): Long

    @Update
    suspend fun updateFixedExpense(expense: FixedExpenseEntity)

    @Delete
    suspend fun deleteFixedExpense(expense: FixedExpenseEntity)

    @Query("DELETE FROM fixed_expenses WHERE id = :id")
    suspend fun deleteFixedExpenseById(id: Long)

    // Daily Expense Logs
    @Query("SELECT * FROM expense_logs ORDER BY timestamp DESC")
    fun getAllExpenseLogsFlow(): Flow<List<ExpenseLogEntity>>

    @Query("SELECT * FROM expense_logs WHERE timestamp >= :sinceTimestamp ORDER BY timestamp DESC")
    fun getExpenseLogsSinceFlow(sinceTimestamp: Long): Flow<List<ExpenseLogEntity>>

    @Query("SELECT * FROM expense_logs WHERE timestamp >= :sinceTimestamp ORDER BY timestamp DESC")
    suspend fun getExpenseLogsSince(sinceTimestamp: Long): List<ExpenseLogEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExpenseLog(log: ExpenseLogEntity): Long

    @Query("DELETE FROM expense_logs WHERE id = :id")
    suspend fun deleteExpenseLogById(id: Long)

    @Query("DELETE FROM expense_logs")
    suspend fun clearAllExpenseLogs()

    // Chat Messages
    @Query("SELECT * FROM chat_messages ORDER BY timestamp ASC")
    fun getAllChatMessagesFlow(): Flow<List<ChatMessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChatMessage(message: ChatMessageEntity): Long

    @Query("DELETE FROM chat_messages")
    suspend fun clearChatMessages()
}
