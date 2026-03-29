package com.kauaan.productivyapp.blocker

import android.content.Context
import android.content.SharedPreferences
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object BlockerPrefs {
  private const val PREFS = "blocker_prefs"
  private const val KEY_SESSION_ACTIVE = "session_active"
  private const val KEY_BLOCKLIST = "blocklist"
  private const val KEY_ATTEMPT_DATE = "attempt_date"
  private const val KEY_ATTEMPT_COUNT = "attempt_count"
  private const val KEY_LAST_ATTEMPT_PACKAGE = "last_attempt_package"
  private const val KEY_LAST_ATTEMPT_TIME = "last_attempt_time"
  private const val KEY_SERVICE_CONNECTED_AT = "service_connected_at"
  private const val KEY_LAST_EVENT_PACKAGE = "last_event_package"
  private const val KEY_LAST_EVENT_TIME = "last_event_time"
  private const val KEY_LAST_BLOCK_SCREEN_LAUNCH_AT = "last_block_screen_launch_at"
  private const val KEY_LAST_BLOCK_SCREEN_ERROR = "last_block_screen_error"
  private const val KEY_TOTAL_FOCUS_PACKAGES = "total_focus_packages"
  private const val KEY_TOTAL_FOCUS_END_AT = "total_focus_end_at"

  private fun prefs(context: Context): SharedPreferences =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isSessionActive(context: Context): Boolean {
      return try {
          prefs(context).getBoolean(KEY_SESSION_ACTIVE, false)
      } catch (e: Exception) {
          false
      }
  }

  fun setSessionActive(context: Context, active: Boolean) {
      try {
          prefs(context).edit().putBoolean(KEY_SESSION_ACTIVE, active).apply()
      } catch (e: Exception) {
          e.printStackTrace()
      }
  }

  fun getBlocklist(context: Context): Set<String> {
      return try {
          val stored = prefs(context).getStringSet(KEY_BLOCKLIST, emptySet())
          stored?.toSet() ?: emptySet()
      } catch (e: Exception) {
          emptySet()
      }
  }

  fun setBlocklist(context: Context, packages: Set<String>) {
      try {
          prefs(context).edit().putStringSet(KEY_BLOCKLIST, packages).apply()
      } catch (e: Exception) {
          e.printStackTrace()
      }
  }

  fun isTotalFocusActive(context: Context): Boolean {
    val endAt = getTotalFocusEndAt(context)
    return endAt > System.currentTimeMillis() && getTotalFocusPackages(context).isNotEmpty()
  }

  fun getTotalFocusPackages(context: Context): Set<String> {
    val endAt = prefs(context).getLong(KEY_TOTAL_FOCUS_END_AT, 0L)
    if (endAt > 0L && endAt <= System.currentTimeMillis()) {
      clearTotalFocus(context)
      return emptySet()
    }

    return try {
      val stored = prefs(context).getStringSet(KEY_TOTAL_FOCUS_PACKAGES, emptySet())
      stored?.toSet() ?: emptySet()
    } catch (e: Exception) {
      emptySet()
    }
  }

  fun setTotalFocus(context: Context, packages: Set<String>, endAt: Long) {
    try {
      prefs(context)
          .edit()
          .putStringSet(KEY_TOTAL_FOCUS_PACKAGES, packages)
          .putLong(KEY_TOTAL_FOCUS_END_AT, endAt)
          .apply()
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  fun clearTotalFocus(context: Context) {
    try {
      prefs(context)
          .edit()
          .remove(KEY_TOTAL_FOCUS_PACKAGES)
          .remove(KEY_TOTAL_FOCUS_END_AT)
          .apply()
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  fun recordAttempt(context: Context, packageName: String) {
    try {
        val prefs = prefs(context)
        val today = dateStamp(System.currentTimeMillis())
        val lastDate = prefs.getString(KEY_ATTEMPT_DATE, null)
        val currentCount =
            if (lastDate == today) prefs.getInt(KEY_ATTEMPT_COUNT, 0) else 0
        prefs.edit()
            .putString(KEY_ATTEMPT_DATE, today)
            .putInt(KEY_ATTEMPT_COUNT, currentCount + 1)
            .putString(KEY_LAST_ATTEMPT_PACKAGE, packageName)
            .putLong(KEY_LAST_ATTEMPT_TIME, System.currentTimeMillis())
            .apply()
    } catch (e: Exception) {
        e.printStackTrace()
    }
  }

  fun recordServiceConnected(context: Context) {
    try {
      prefs(context).edit().putLong(KEY_SERVICE_CONNECTED_AT, System.currentTimeMillis()).apply()
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  fun recordWindowEvent(context: Context, packageName: String) {
    try {
      prefs(context)
          .edit()
          .putString(KEY_LAST_EVENT_PACKAGE, packageName)
          .putLong(KEY_LAST_EVENT_TIME, System.currentTimeMillis())
          .apply()
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  fun recordBlockScreenLaunch(context: Context, errorMessage: String?) {
    try {
      prefs(context)
          .edit()
          .putLong(KEY_LAST_BLOCK_SCREEN_LAUNCH_AT, System.currentTimeMillis())
          .putString(KEY_LAST_BLOCK_SCREEN_ERROR, errorMessage)
          .apply()
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  fun getAttemptCount(context: Context): Int =
      prefs(context).getInt(KEY_ATTEMPT_COUNT, 0)

  fun getAttemptDate(context: Context): String? =
      prefs(context).getString(KEY_ATTEMPT_DATE, null)

  fun getLastAttemptPackage(context: Context): String? =
      prefs(context).getString(KEY_LAST_ATTEMPT_PACKAGE, null)

  fun getLastAttemptTime(context: Context): Long =
      prefs(context).getLong(KEY_LAST_ATTEMPT_TIME, 0L)

  fun getServiceConnectedAt(context: Context): Long =
      prefs(context).getLong(KEY_SERVICE_CONNECTED_AT, 0L)

  fun getLastEventPackage(context: Context): String? =
      prefs(context).getString(KEY_LAST_EVENT_PACKAGE, null)

  fun getLastEventTime(context: Context): Long =
      prefs(context).getLong(KEY_LAST_EVENT_TIME, 0L)

  fun getLastBlockScreenLaunchAt(context: Context): Long =
      prefs(context).getLong(KEY_LAST_BLOCK_SCREEN_LAUNCH_AT, 0L)

  fun getLastBlockScreenError(context: Context): String? =
      prefs(context).getString(KEY_LAST_BLOCK_SCREEN_ERROR, null)

  fun getTotalFocusEndAt(context: Context): Long {
    val endAt = prefs(context).getLong(KEY_TOTAL_FOCUS_END_AT, 0L)
    if (endAt > 0L && endAt <= System.currentTimeMillis()) {
      clearTotalFocus(context)
      return 0L
    }
    return endAt
  }

  private fun dateStamp(timestamp: Long): String {
    val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    return formatter.format(Date(timestamp))
  }
}
