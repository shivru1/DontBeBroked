package com.example

import android.app.Application
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.BudgetViewModel
import com.example.ui.components.FixedExpenseSheet
import com.example.ui.components.LogExpenseSheet
import com.example.ui.screens.ChatAdvisorScreen
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.HistoryScreen
import com.example.ui.screens.SettingsScreen
import com.example.ui.screens.SetupScreen
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                DontBeBrokeApp()
            }
        }
    }
}

// Main Composable Application
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DontBeBrokeApp() {
    val context = LocalContext.current
    val application = context.applicationContext as Application

    val viewModel: BudgetViewModel = viewModel(
        factory = BudgetViewModel.provideFactory(application)
    )

    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var selectedTab by remember { mutableIntStateOf(0) }
    var showLogExpenseSheet by remember { mutableStateOf(false) }
    var showAddFixedExpenseSheet by remember { mutableStateOf(false) }

    val logExpenseSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val fixedExpenseSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    if (!uiState.isSetupCompleted) {
        SetupScreen(
            onSetupComplete = { salary, salaryDay, fixedExpenses ->
                viewModel.completeSetup(salary, salaryDay, fixedExpenses)
            }
        )
    } else {
        Scaffold(
            modifier = Modifier
                .fillMaxSize()
                .testTag("app_scaffold"),
            bottomBar = {
                NavigationBar(modifier = Modifier.testTag("bottom_nav_bar")) {
                    NavigationBarItem(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        icon = { Icon(Icons.Default.Dashboard, contentDescription = "Dashboard") },
                        label = { Text("Dashboard") },
                        modifier = Modifier.testTag("nav_tab_dashboard")
                    )
                    NavigationBarItem(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        icon = { Icon(Icons.AutoMirrored.Filled.Chat, contentDescription = "AI Advisor") },
                        label = { Text("Advisor") },
                        modifier = Modifier.testTag("nav_tab_advisor")
                    )
                    NavigationBarItem(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        icon = { Icon(Icons.Default.History, contentDescription = "History") },
                        label = { Text("History") },
                        modifier = Modifier.testTag("nav_tab_history")
                    )
                    NavigationBarItem(
                        selected = selectedTab == 3,
                        onClick = { selectedTab = 3 },
                        icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                        label = { Text("Settings") },
                        modifier = Modifier.testTag("nav_tab_settings")
                    )
                }
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                when (selectedTab) {
                    0 -> DashboardScreen(
                        state = uiState,
                        onOpenLogSheet = { showLogExpenseSheet = true },
                        onLogQuickText = { text -> viewModel.logExpenseFromText(text) },
                        onNavigateToChat = { selectedTab = 1 },
                        onNavigateToHistory = { selectedTab = 2 }
                    )
                    1 -> ChatAdvisorScreen(
                        state = uiState,
                        onSendMessage = { text -> viewModel.sendChatMessage(text) },
                        onClearChat = { viewModel.clearChat() }
                    )
                    2 -> HistoryScreen(
                        state = uiState,
                        onDeleteExpense = { id -> viewModel.deleteExpenseLog(id) }
                    )
                    3 -> SettingsScreen(
                        state = uiState,
                        onUpdateProfile = { salary, salaryDay -> viewModel.updateProfile(salary, salaryDay) },
                        onOpenAddFixedExpense = { showAddFixedExpenseSheet = true },
                        onDeleteFixedExpense = { id -> viewModel.deleteFixedExpense(id) },
                        onResetAll = {
                            viewModel.resetAllData()
                            selectedTab = 0
                        }
                    )
                }
            }
        }

        // Log Daily Expense Modal Bottom Sheet
        if (showLogExpenseSheet) {
            val currency = uiState.userProfile?.currencySymbol ?: "₹"
            LogExpenseSheet(
                currencySymbol = currency,
                currentFairDailyBudget = uiState.fairDailyBudget,
                currentRemainingBalance = uiState.remainingBalance,
                daysRemaining = uiState.daysRemaining,
                sheetState = logExpenseSheetState,
                onDismiss = { showLogExpenseSheet = false },
                onConfirm = { amount, note ->
                    viewModel.logExpense(amount, note)
                }
            )
        }

        // Add Fixed Expense Modal Bottom Sheet
        if (showAddFixedExpenseSheet) {
            val currency = uiState.userProfile?.currencySymbol ?: "₹"
            FixedExpenseSheet(
                currencySymbol = currency,
                sheetState = fixedExpenseSheetState,
                onDismiss = { showAddFixedExpenseSheet = false },
                onConfirm = { label, amount ->
                    viewModel.addFixedExpense(label, amount)
                }
            )
        }
    }
}

// Kept for screenshot test backward compatibility
@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Text(text = "Hello $name!", modifier = modifier)
}
