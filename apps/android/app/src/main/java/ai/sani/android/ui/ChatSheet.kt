package ai.sani.android.ui

import androidx.compose.runtime.Composable
import ai.sani.android.MainViewModel
import ai.sani.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
