package com.kauaan.productivy.blocker

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent

import android.util.Log

class BlockerAccessibilityService : AccessibilityService() {
  private var lastBlockedPackage: String? = null
  private var lastBlockTimestamp = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
    Log.d("AppBlocker", "Service Connected")
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val packageName = event.packageName?.toString() ?: return
    
    // Log.d("AppBlocker", "Event detected from: $packageName") // Uncomment if very verbose needed

    if (packageName == this.packageName) return
    if (!BlockerPrefs.isSessionActive(this)) return
    
    val blocklist = BlockerPrefs.getBlocklist(this)
    if (!blocklist.contains(packageName)) return

    Log.d("AppBlocker", "Blocking package: $packageName")

    val now = SystemClock.elapsedRealtime()
    if (packageName == lastBlockedPackage && now - lastBlockTimestamp < 1200) {
      return
    }
    lastBlockedPackage = packageName
    lastBlockTimestamp = now

    BlockerPrefs.recordAttempt(this, packageName)
    launchBlockScreen(packageName)
  }

  override fun onInterrupt() {
    // No-op.
  }

  private fun launchBlockScreen(blockedPackage: String) {
    try {
      val intent = Intent(this, BlockScreenActivity::class.java).apply {
        addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
        )
        putExtra(BlockScreenActivity.EXTRA_BLOCKED_PACKAGE, blockedPackage)
      }
      startActivity(intent)
    } catch (e: Exception) {
      e.printStackTrace()
      Log.e("AppBlocker", "CRITICAL FAILURE launching block screen", e)
    }
  }
}
