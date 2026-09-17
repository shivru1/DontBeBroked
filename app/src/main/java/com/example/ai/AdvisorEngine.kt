package com.example.ai

import com.example.BuildConfig
import com.example.domain.BudgetCalculator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import kotlin.math.abs
import kotlin.math.roundToInt

object AdvisorEngine {

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    private fun isGeminiConfigured(): Boolean {
        val key = try {
            BuildConfig.GEMINI_API_KEY
        } catch (e: Throwable) {
            ""
        }
        return key.isNotBlank() && key != "MY_GEMINI_API_KEY" && !key.contains("placeholder", ignoreCase = true)
    }

    /**
     * Generates a direct, practical, smart-friend response after an expense is logged.
     */
    suspend fun generateExpenseResponse(
        currencySymbol: String,
        amountSpent: Double,
        note: String,
        previousFairDailyBudget: Double,
        remainingBalanceAfter: Double,
        daysRemaining: Int,
        totalSpentToday: Double
    ): String {
        // First, check if we can enhance with Gemini API
        if (isGeminiConfigured()) {
            try {
                val prompt = buildExpensePrompt(
                    currencySymbol = currencySymbol,
                    amountSpent = amountSpent,
                    note = note,
                    previousFairDailyBudget = previousFairDailyBudget,
                    remainingBalanceAfter = remainingBalanceAfter,
                    daysRemaining = daysRemaining,
                    totalSpentToday = totalSpentToday
                )
                val geminiResponse = queryGemini(prompt)
                if (!geminiResponse.isNullOrBlank()) {
                    return geminiResponse.trim()
                }
            } catch (_: Exception) {
                // Fall through to deterministic smart advisor
            }
        }

        // Deterministic high-craft rule-based mathematical response
        return generateLocalRuleBasedResponse(
            currencySymbol = currencySymbol,
            amountSpent = amountSpent,
            note = note,
            previousFairDailyBudget = previousFairDailyBudget,
            remainingBalanceAfter = remainingBalanceAfter,
            daysRemaining = daysRemaining,
            totalSpentToday = totalSpentToday
        )
    }

    /**
     * Handles freeform chat with the advisor (e.g. "Can I buy shoes for ₹1500?").
     */
    suspend fun generateChatAdvice(
        userMessage: String,
        currencySymbol: String,
        monthlySalary: Double,
        totalFixedExpenses: Double,
        remainingBalance: Double,
        fairDailyBudget: Double,
        daysRemaining: Int,
        todaySpent: Double
    ): String {
        if (isGeminiConfigured()) {
            try {
                val prompt = """
                    You are DontBeBroke's AI Chat Advisor.
                    The user's current financial situation:
                    - Monthly Salary: $currencySymbol$monthlySalary
                    - Fixed Expenses: $currencySymbol$totalFixedExpenses
                    - Current Remaining Balance: $currencySymbol$remainingBalance
                    - Days Remaining until Next Payday: $daysRemaining days
                    - Fair Daily Budget: $currencySymbol$fairDailyBudget / day
                    - Spent Today So Far: $currencySymbol$todaySpent
                    
                    User query: "$userMessage"
                    
                    Tone rules:
                    1. Direct, practical, honest, smart friend doing the math.
                    2. Never preachy, judgmental, or corporate.
                    3. Do the exact math on how their decision impacts their remaining days and new daily budget.
                    4. Keep it concise (under 4 sentences).
                """.trimIndent()

                val geminiResponse = queryGemini(prompt)
                if (!geminiResponse.isNullOrBlank()) {
                    return geminiResponse.trim()
                }
            } catch (_: Exception) {
                // Fall back
            }
        }

        // Local intelligent conversational fallback
        return generateLocalChatAdvice(
            userMessage = userMessage,
            currencySymbol = currencySymbol,
            remainingBalance = remainingBalance,
            fairDailyBudget = fairDailyBudget,
            daysRemaining = daysRemaining,
            todaySpent = todaySpent
        )
    }

    private fun generateLocalRuleBasedResponse(
        currencySymbol: String,
        amountSpent: Double,
        note: String,
        previousFairDailyBudget: Double,
        remainingBalanceAfter: Double,
        daysRemaining: Int,
        totalSpentToday: Double
    ): String {
        val spentFmt = BudgetCalculator.formatCurrency(amountSpent, currencySymbol)
        val prevBudgetFmt = BudgetCalculator.formatCurrency(previousFairDailyBudget, currencySymbol)
        val remainingFmt = BudgetCalculator.formatCurrency(remainingBalanceAfter, currencySymbol)
        val noteSuffix = if (note.isNotBlank() && note != "Daily Expense") " on $note" else ""

        // Case 1: Negative balance alert
        if (remainingBalanceAfter < 0) {
            val deficit = BudgetCalculator.formatCurrency(abs(remainingBalanceAfter), currencySymbol)
            return "⚠️ Overdraft Alert: You spent $spentFmt$noteSuffix, pushing your balance to -$deficit with $daysRemaining days left until payday. You're officially in the danger zone. Stop all discretionary spending immediately to survive the month."
        }

        // Case 2: Exact zero
        if (remainingBalanceAfter == 0.0) {
            return "⚠️ Zero Balance: That $spentFmt spend brought your remaining balance to exactly $currencySymbol 0 with $daysRemaining days to go. Every single remaining day requires ₹0 spending until salary hits."
        }

        // Case 3: Days remaining is 1 (final day before salary)
        if (daysRemaining <= 1) {
            return if (totalSpentToday > previousFairDailyBudget) {
                "Last day before payday! You spent $spentFmt$noteSuffix, exceeding your $prevBudgetFmt target. You have $remainingFmt left to finish out today."
            } else {
                "Final stretch! You spent $spentFmt$noteSuffix today, staying nicely within your $prevBudgetFmt limit. You have $remainingFmt left before your salary arrives tomorrow."
            }
        }

        // Future days from tomorrow:
        val futureDays = daysRemaining - 1
        val newDailyLimit = BudgetCalculator.computeFairDailyBudget(remainingBalanceAfter, futureDays)
        val newLimitFmt = BudgetCalculator.formatCurrency(newDailyLimit, currencySymbol)

        // Case 4: Over today's fair daily budget
        if (totalSpentToday > previousFairDailyBudget) {
            val balanceBefore = remainingBalanceAfter + amountSpent
            val balanceBeforeFmt = BudgetCalculator.formatCurrency(balanceBefore, currencySymbol)

            return "You had $balanceBeforeFmt left with $daysRemaining days to go — that was $prevBudgetFmt/day. You spent $spentFmt today$noteSuffix, so tomorrow onwards you only have $remainingFmt left across $futureDays days ($newLimitFmt/day). You were supposed to spend closer to $prevBudgetFmt today to stay balanced."
        }

        // Case 5: Under or within fair daily budget
        return "Nice discipline! You spent $spentFmt$noteSuffix today, keeping you well within your $prevBudgetFmt fair daily limit. You now have $remainingFmt across $daysRemaining days, giving you an adjusted budget of $newLimitFmt/day."
    }

    private fun generateLocalChatAdvice(
        userMessage: String,
        currencySymbol: String,
        remainingBalance: Double,
        fairDailyBudget: Double,
        daysRemaining: Int,
        todaySpent: Double
    ): String {
        val lower = userMessage.lowercase()
        val numMatch = Regex("""\b\d+(?:\.\d+)?\b""").find(userMessage)
        val extractedAmount = numMatch?.value?.toDoubleOrNull()

        val balanceFmt = BudgetCalculator.formatCurrency(remainingBalance, currencySymbol)
        val budgetFmt = BudgetCalculator.formatCurrency(fairDailyBudget, currencySymbol)

        // If asking about a specific cost: "Can I buy / afford X?"
        if (extractedAmount != null && (lower.contains("afford") || lower.contains("buy") || lower.contains("spend") || lower.contains("can i"))) {
            val costFmt = BudgetCalculator.formatCurrency(extractedAmount, currencySymbol)
            if (extractedAmount > remainingBalance) {
                return "No, you cannot afford $costFmt. You only have $balanceFmt total left for the next $daysRemaining days. Spending $costFmt will immediately put you in debt."
            }

            val leftover = remainingBalance - extractedAmount
            val futureDays = maxOf(1, daysRemaining - 1)
            val newDaily = leftover / futureDays
            val newDailyFmt = BudgetCalculator.formatCurrency(newDaily, currencySymbol)

            return if (extractedAmount > fairDailyBudget * 1.5) {
                "Spending $costFmt today is heavy. Your fair daily limit is $budgetFmt. If you spend $costFmt, your remaining balance drops to ${BudgetCalculator.formatCurrency(leftover, currencySymbol)}, leaving you with only $newDailyFmt/day for the next $futureDays days. Proceed only if essential."
            } else {
                "Yes, you can squeeze in $costFmt. It leaves you with ${BudgetCalculator.formatCurrency(leftover, currencySymbol)} over $daysRemaining days ($newDailyFmt/day). Keep subsequent days light to compensate."
            }
        }

        // General status inquiries
        if (lower.contains("how am i doing") || lower.contains("status") || lower.contains("summary") || lower.contains("overview")) {
            val spentTodayFmt = BudgetCalculator.formatCurrency(todaySpent, currencySymbol)
            return "Current standing: You have $balanceFmt remaining across $daysRemaining days until your next salary. That works out to $budgetFmt per day. You've spent $spentTodayFmt today."
        }

        // Tips to save / survive
        if (lower.contains("tip") || lower.contains("save") || lower.contains("help") || lower.contains("broke")) {
            return "To stay safe until payday: 1) Cap today's total spend strictly at $budgetFmt. 2) Cook at home or use existing groceries. 3) Delay any purchase over $budgetFmt until salary day."
        }

        return "You have $balanceFmt left for the next $daysRemaining days ($budgetFmt/day). Log your expenses as soon as you make them so I can recalibrate your daily allowance."
    }

    private fun buildExpensePrompt(
        currencySymbol: String,
        amountSpent: Double,
        note: String,
        previousFairDailyBudget: Double,
        remainingBalanceAfter: Double,
        daysRemaining: Int,
        totalSpentToday: Double
    ): String {
        return """
            The user just logged an expense in DontBeBroke app:
            - Amount spent: $currencySymbol$amountSpent
            - Item/Note: "$note"
            - Total spent today so far: $currencySymbol$totalSpentToday
            - Today's Fair Daily Budget target was: $currencySymbol$previousFairDailyBudget
            - Remaining balance after this spend: $currencySymbol$remainingBalanceAfter
            - Days left until next salary: $daysRemaining days
            
            Respond as a direct, smart, practical friend who does the math for them:
            1. State whether this spend was within or above their fair daily budget.
            2. State the exact breakdown: how much they had, what they spent, what is left, and what their daily budget is now for remaining days.
            3. If they are over budget, tell them what they should have spent to stay balanced.
            4. If they are at risk of going negative (< 0), flag the danger clearly.
            5. Keep it under 3 concise sentences. No corporate or preachy lecturing.
        """.trimIndent()
    }

    private suspend fun queryGemini(promptText: String): String? = withContext(Dispatchers.IO) {
        val apiKey = BuildConfig.GEMINI_API_KEY
        val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=$apiKey"

        val systemInstruction = "You are DontBeBroke's AI Budget Advisor. You speak like a smart, direct friend doing the exact math on daily spending limits. Never preach or judge. Keep answers concise."

        val requestJson = JSONObject().apply {
            put("systemInstruction", JSONObject().apply {
                put("parts", JSONArray().apply {
                    put(JSONObject().apply { put("text", systemInstruction) })
                })
            })
            put("contents", JSONArray().apply {
                put(JSONObject().apply {
                    put("parts", JSONArray().apply {
                        put(JSONObject().apply { put("text", promptText) })
                    })
                })
            })
            put("generationConfig", JSONObject().apply {
                put("temperature", 0.7)
                put("maxOutputTokens", 1024)
                put("thinkingConfig", JSONObject().apply {
                    put("thinkingBudget", 0)
                })
            })
        }

        val request = Request.Builder()
            .url(url)
            .post(requestJson.toString().toRequestBody(jsonMediaType))
            .build()

        val response = httpClient.newCall(request).execute()
        if (!response.isSuccessful) {
            return@withContext null
        }

        val responseBody = response.body?.string() ?: return@withContext null
        val root = JSONObject(responseBody)
        val candidates = root.optJSONArray("candidates") ?: return@withContext null
        if (candidates.length() == 0) return@withContext null
        val firstCandidate = candidates.getJSONObject(0)
        val content = firstCandidate.optJSONObject("content") ?: return@withContext null
        val parts = content.optJSONArray("parts") ?: return@withContext null
        if (parts.length() == 0) return@withContext null
        parts.getJSONObject(0).optString("text")
    }
}
