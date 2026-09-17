package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "user_profile")
data class UserProfileEntity(
    @PrimaryKey val id: Int = 1,
    val monthlySalary: Double = 0.0,
    val salaryDayOfMonth: Int = 1, // 1 - 31
    val currencySymbol: String = "₹",
    val isSetupCompleted: Boolean = false
)

@Entity(tableName = "fixed_expenses")
data class FixedExpenseEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val label: String,
    val amount: Double
)

@Entity(tableName = "expense_logs")
data class ExpenseLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val amount: Double,
    val note: String,
    val timestamp: Long = System.currentTimeMillis(),
    val dateKey: String, // e.g. "2026-09-17"
    val fairDailyBudgetAtTime: Double,
    val daysRemainingAtTime: Int,
    val remainingBalanceAfter: Double,
    val wasWithinBudget: Boolean
)

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sender: String, // "USER" or "ADVISOR"
    val text: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isExpenseNotification: Boolean = false,
    val isAlert: Boolean = false
)
