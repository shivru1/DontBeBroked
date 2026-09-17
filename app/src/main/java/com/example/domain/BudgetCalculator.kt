package com.example.domain

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

object BudgetCalculator {

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val displayDateFormat = SimpleDateFormat("MMM d, yyyy", Locale.US)
    private val dayMonthFormat = SimpleDateFormat("MMM d", Locale.US)

    fun getTodayDateKey(timeMillis: Long = System.currentTimeMillis()): String {
        return dateFormat.format(Date(timeMillis))
    }

    fun formatDateForDisplay(timeMillis: Long): String {
        return displayDateFormat.format(Date(timeMillis))
    }

    fun formatShortDate(timeMillis: Long): String {
        return dayMonthFormat.format(Date(timeMillis))
    }

    /**
     * Calculates the cycle start date and next salary date based on salaryDayOfMonth (1-31).
     */
    data class CycleDates(
        val cycleStartMillis: Long,
        val nextSalaryMillis: Long,
        val daysRemaining: Int
    )

    fun calculateCycle(salaryDayOfMonth: Int, currentTimeMillis: Long = System.currentTimeMillis()): CycleDates {
        val clampedSalaryDay = salaryDayOfMonth.coerceIn(1, 31)

        val now = Calendar.getInstance().apply {
            timeInMillis = currentTimeMillis
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        val todayDay = now.get(Calendar.DAY_OF_MONTH)

        // Cycle start
        val cycleStart = Calendar.getInstance().apply {
            timeInMillis = now.timeInMillis
            if (todayDay >= clampedSalaryDay) {
                // Started in current month
                val maxDay = getActualMaximum(Calendar.DAY_OF_MONTH)
                set(Calendar.DAY_OF_MONTH, clampedSalaryDay.coerceAtMost(maxDay))
            } else {
                // Started in previous month
                add(Calendar.MONTH, -1)
                val maxDay = getActualMaximum(Calendar.DAY_OF_MONTH)
                set(Calendar.DAY_OF_MONTH, clampedSalaryDay.coerceAtMost(maxDay))
            }
        }

        // Next salary date
        val nextSalary = Calendar.getInstance().apply {
            timeInMillis = now.timeInMillis
            if (todayDay < clampedSalaryDay) {
                // Next salary is in current month
                val maxDay = getActualMaximum(Calendar.DAY_OF_MONTH)
                set(Calendar.DAY_OF_MONTH, clampedSalaryDay.coerceAtMost(maxDay))
            } else {
                // Next salary is in next month
                add(Calendar.MONTH, 1)
                val maxDay = getActualMaximum(Calendar.DAY_OF_MONTH)
                set(Calendar.DAY_OF_MONTH, clampedSalaryDay.coerceAtMost(maxDay))
            }
        }

        // Compute days difference between today and next salary date
        val diffMillis = nextSalary.timeInMillis - now.timeInMillis
        val diffDays = (diffMillis / (1000L * 60 * 60 * 24)).toInt()
        val daysRemaining = maxOf(1, diffDays)

        return CycleDates(
            cycleStartMillis = cycleStart.timeInMillis,
            nextSalaryMillis = nextSalary.timeInMillis,
            daysRemaining = daysRemaining
        )
    }

    /**
     * Computes remaining balance and fair daily budget.
     */
    fun computeFairDailyBudget(
        remainingBalance: Double,
        daysRemaining: Int
    ): Double {
        if (daysRemaining <= 0) return remainingBalance
        return remainingBalance / daysRemaining
    }

    fun formatCurrency(amount: Double, symbol: String = "₹"): String {
        return if (amount % 1.0 == 0.0) {
            String.format(Locale.US, "%s%,.0f", symbol, amount)
        } else {
            String.format(Locale.US, "%s%,.2f", symbol, amount)
        }
    }
}
