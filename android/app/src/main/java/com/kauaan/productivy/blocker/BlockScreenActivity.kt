package com.kauaan.productivy.blocker

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.kauaan.productivy.MainActivity
import com.kauaan.productivy.R

class BlockScreenActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_block_screen)

    val blockedPackage = intent.getStringExtra(EXTRA_BLOCKED_PACKAGE)
    val packageText = findViewById<TextView>(R.id.blocked_package_text)
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

  companion object {
    const val EXTRA_BLOCKED_PACKAGE = "blockedPackage"
  }
}
