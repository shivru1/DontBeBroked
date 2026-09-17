package com.example.domain

object ExpenseParser {

    data class ParsedExpense(
        val amount: Double?,
        val note: String
    )

    /**
     * Parses freeform natural language text to extract amount and note.
     * Examples:
     * - "I spent ₹450 today" -> amount: 450.0, note: "Daily Expense"
     * - "Spent 350 on lunch" -> amount: 350.0, note: "Lunch"
     * - "Groceries ₹1200" -> amount: 1200.0, note: "Groceries"
     * - "250 coffee" -> amount: 250.0, note: "Coffee"
     * - "₹500" -> amount: 500.0, note: "Quick Expense"
     */
    fun parse(input: String): ParsedExpense {
        val trimmed = input.trim()
        if (trimmed.isEmpty()) {
            return ParsedExpense(amount = null, note = "")
        }

        // Regex to find currency symbols and amounts like ₹450, 450, 450.50, Rs 450, INR 450
        val amountRegex = Regex("""(?:(?:₹|Rs\.?|INR|\$)\s*)?([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|(?:[0-9]+\.[0-9]{1,2}))(?:\s*(?:₹|Rs\.?|INR|\$))?""", RegexOption.IGNORE_CASE)
        val match = amountRegex.findAll(trimmed).firstOrNull { it.groupValues[1].isNotEmpty() }

        if (match == null) {
            return ParsedExpense(amount = null, note = trimmed)
        }

        val rawAmountStr = match.groupValues[1].replace(",", "")
        val parsedAmount = rawAmountStr.toDoubleOrNull()

        // Extract the remaining text for the note
        var remaining = trimmed.replaceRange(match.range, " ")
            .replace(Regex("""(?i)\b(i spent|spent|paid|bought|for|on|today|yesterday|rs\.?|inr|₹|\$)\b"""), " ")
            .replace(Regex("""\s+"""), " ")
            .trim()

        if (remaining.isEmpty()) {
            remaining = "Daily Expense"
        } else {
            // Capitalize first letter
            remaining = remaining.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        }

        return ParsedExpense(amount = parsedAmount, note = remaining)
    }
}
