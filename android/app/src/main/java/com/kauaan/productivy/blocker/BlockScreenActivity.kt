package com.kauaan.productivy.blocker

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.kauaan.productivy.MainActivity
import com.kauaan.productivy.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class BlockScreenActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_block_screen)

    val blockedPackage = intent.getStringExtra(EXTRA_BLOCKED_PACKAGE)
    val totalFocusMode = intent.getBooleanExtra(EXTRA_TOTAL_FOCUS_MODE, false)
    val totalFocusEndAt = intent.getLongExtra(EXTRA_TOTAL_FOCUS_END_AT, 0L)
    val packageText = findViewById<TextView>(R.id.blocked_package_text)
    val titleText = findViewById<TextView>(R.id.blocked_title)
    val subtitleText = findViewById<TextView>(R.id.blocked_subtitle)

    if (totalFocusMode) {
      titleText.text = "Bloqueado pelo foco total"
      subtitleText.text = buildTotalFocusSubtitle(totalFocusEndAt)
    }

    if (!blockedPackage.isNullOrBlank()) {
      packageText.text = blockedPackage
    }

    val backButton = findViewById<Button>(R.id.block_back_button)
    backButton.setOnClickListener { openMainApp() }
  }

  override fun onBackPressed() {
    openMainApp()
  }

  private fun openMainApp() {
    val intent = Intent(this, MainActivity::class.java).apply {
      addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
              Intent.FLAG_ACTIVITY_CLEAR_TOP or
              Intent.FLAG_ACTIVITY_SINGLE_TOP
      )
    }
    startActivity(intent)
    finish()
  }

  private fun buildTotalFocusSubtitle(endAt: Long): String {
    if (endAt <= 0L) {
      return "Todos os apps ficam bloqueados ate o fim do foco total."
    }

    val formatter = SimpleDateFormat("dd/MM 'as' HH:mm", Locale("pt", "BR"))
    return "Todos os apps ficam bloqueados ate ${formatter.format(Date(endAt))}."
  }

  companion object {
    const val EXTRA_BLOCKED_PACKAGE = "blockedPackage"
    const val EXTRA_TOTAL_FOCUS_MODE = "totalFocusMode"
    const val EXTRA_TOTAL_FOCUS_END_AT = "totalFocusEndAt"
  }
}
