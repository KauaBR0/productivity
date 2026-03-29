package com.kauaan.productivyapp.blocker

import android.content.Intent
import android.content.pm.ResolveInfo
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import java.util.Locale
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import android.content.pm.ApplicationInfo

import android.util.Log

class BlockerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
  companion object {
    private val STRONG_FRICTION_PACKAGES = setOf(
        "com.android.settings",
        "com.android.packageinstaller",
        "com.google.android.packageinstaller",
        "com.samsung.android.packageinstaller",
        "com.miui.packageinstaller",
        "com.android.permissioncontroller",
        "com.google.android.permissioncontroller",
        "com.android.vending",
        "com.sec.android.app.samsungapps",
        "com.xiaomi.market",
        "com.huawei.appmarket",
        "com.heytap.market",
        "com.oppo.market",
        "com.miui.securitycenter",
        "com.coloros.safecenter"
    )
  }

  override fun getName(): String = "AppBlocker"

  @ReactMethod
  fun setSessionActive(active: Boolean) {
    Log.d("AppBlocker", "setSessionActive called with: $active")
    try {
        BlockerPrefs.setSessionActive(reactContext, active)
    } catch (e: Exception) {
        Log.e("AppBlocker", "Error in setSessionActive", e)
    }
  }

  @ReactMethod
  fun setBlocklist(packages: ReadableArray) {
    Log.d("AppBlocker", "setBlocklist called with ${packages.size()} items")
    try {
        val set = mutableSetOf<String>()
        for (i in 0 until packages.size()) {
          if (packages.getType(i) == ReadableType.String) {
             val value = packages.getString(i)
             if (!value.isNullOrBlank()) {
               set.add(value)
             }
          }
        }
        BlockerPrefs.setBlocklist(reactContext, set)
    } catch (e: Exception) {
        Log.e("AppBlocker", "Error in setBlocklist", e)
    }
  }

  @ReactMethod
  fun getAttemptStats(promise: Promise) {
    val map = Arguments.createMap()
    map.putInt("countToday", BlockerPrefs.getAttemptCount(reactContext))
    map.putString("lastAttemptDate", BlockerPrefs.getAttemptDate(reactContext))
    map.putString("lastAttemptPackage", BlockerPrefs.getLastAttemptPackage(reactContext))
    map.putDouble("lastAttemptTime", BlockerPrefs.getLastAttemptTime(reactContext).toDouble())
    promise.resolve(map)
  }

  @ReactMethod
  fun getDiagnostics(promise: Promise) {
    try {
      val powerManager = reactContext.getSystemService(PowerManager::class.java)
      val ignoringBatteryOptimizations =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && powerManager != null) {
            powerManager.isIgnoringBatteryOptimizations(reactContext.packageName)
          } else {
            true
          }

      val map = Arguments.createMap().apply {
        putBoolean("accessibilityEnabled", isAccessibilityServiceEnabled())
        putBoolean("sessionActive", BlockerPrefs.isSessionActive(reactContext))
        putInt("blocklistSize", BlockerPrefs.getBlocklist(reactContext).size)
        putBoolean("totalFocusActive", BlockerPrefs.isTotalFocusActive(reactContext))
        putDouble("totalFocusEndAt", BlockerPrefs.getTotalFocusEndAt(reactContext).toDouble())
        putInt("totalFocusBlocklistSize", BlockerPrefs.getTotalFocusPackages(reactContext).size)
        putString("manufacturer", Build.MANUFACTURER ?: "")
        putString("brand", Build.BRAND ?: "")
        putString("model", Build.MODEL ?: "")
        putBoolean("ignoringBatteryOptimizations", ignoringBatteryOptimizations)
        putDouble("serviceConnectedAt", BlockerPrefs.getServiceConnectedAt(reactContext).toDouble())
        putString("lastEventPackage", BlockerPrefs.getLastEventPackage(reactContext))
        putDouble("lastEventTime", BlockerPrefs.getLastEventTime(reactContext).toDouble())
        putString("lastAttemptPackage", BlockerPrefs.getLastAttemptPackage(reactContext))
        putDouble("lastAttemptTime", BlockerPrefs.getLastAttemptTime(reactContext).toDouble())
        putInt("attemptCountToday", BlockerPrefs.getAttemptCount(reactContext))
        putDouble(
            "lastBlockScreenLaunchAt",
            BlockerPrefs.getLastBlockScreenLaunchAt(reactContext).toDouble()
        )
        putString("lastBlockScreenError", BlockerPrefs.getLastBlockScreenError(reactContext))
      }

      promise.resolve(map)
    } catch (error: Exception) {
      promise.reject("ERR_BLOCKER_DIAGNOSTICS", error)
    }
  }

  @ReactMethod
  fun enableTotalFocus(durationHours: Int, promise: Promise) {
    try {
      val safeDurationHours = durationHours.coerceIn(1, 24 * 30)
      val blockablePackages =
          (getLaunchableApps(includeHomeApps = false).map { it.packageName } + STRONG_FRICTION_PACKAGES)
              .toSet()

      if (blockablePackages.isEmpty()) {
        promise.reject("ERR_TOTAL_FOCUS_EMPTY", "Nao foi possivel montar a lista de apps para o foco total.")
        return
      }

      val now = System.currentTimeMillis()
      val currentEndAt = BlockerPrefs.getTotalFocusEndAt(reactContext)
      val baseTime = maxOf(now, currentEndAt)
      val nextEndAt = baseTime + safeDurationHours * 60L * 60L * 1000L

      BlockerPrefs.setTotalFocus(reactContext, blockablePackages, nextEndAt)

      val map = Arguments.createMap().apply {
        putBoolean("active", true)
        putDouble("endAt", nextEndAt.toDouble())
        putInt("blockedAppsCount", blockablePackages.size)
      }

      promise.resolve(map)
    } catch (error: Exception) {
      promise.reject("ERR_TOTAL_FOCUS_ENABLE", error)
    }
  }

  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    try {
      val result = Arguments.createArray()
      getLaunchableApps().forEach { app ->
        val map = Arguments.createMap()
        map.putString("packageName", app.packageName)
        map.putString("label", app.label)
        map.putString("category", app.category)
        result.pushMap(map)
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("ERR_APPS", error)
    }
  }

  @ReactMethod
  fun openAccessibilitySettings() {
    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun isAccessibilityEnabled(promise: Promise) {
    val enabled =
        isServiceEnabled(
            reactContext,
            reactContext.packageName +
                "/" +
                BlockerAccessibilityService::class.java.name
        )
    promise.resolve(enabled)
  }

  @ReactMethod
  fun checkOverlayPermission(promise: Promise) {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
      promise.resolve(Settings.canDrawOverlays(reactContext))
    } else {
      promise.resolve(true)
    }
  }

  @ReactMethod
  fun requestOverlayPermission() {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
      if (!Settings.canDrawOverlays(reactContext)) {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            android.net.Uri.parse("package:" + reactContext.packageName)
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
      }
    }
  }

  @ReactMethod
  fun openBatteryOptimizationSettings() {
    try {
      val intent =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
          } else {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
              data = Uri.parse("package:" + reactContext.packageName)
            }
          }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
    } catch (e: Exception) {
      val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
        data = Uri.parse("package:" + reactContext.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(fallbackIntent)
    }
  }

  @ReactMethod
  fun openAppDetailsSettings() {
    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
      data = Uri.parse("package:" + reactContext.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  private data class LaunchableApp(
      val packageName: String,
      val label: String,
      val category: String
  )

  private fun getLaunchableApps(includeHomeApps: Boolean = true): List<LaunchableApp> {
    val pm = reactContext.packageManager
    val intent = Intent(Intent.ACTION_MAIN, null).apply {
      addCategory(Intent.CATEGORY_LAUNCHER)
    }
    val resolveInfos = pm.queryIntentActivities(intent, 0)
    val defaultHomePackage = if (includeHomeApps) null else getDefaultHomePackage()

    val appMap = LinkedHashMap<String, LaunchableApp>()

    resolveInfos.forEach { info ->
      val pkg = info.activityInfo.packageName ?: return@forEach
      if (pkg == reactContext.packageName) return@forEach
      if (!includeHomeApps && pkg == defaultHomePackage) return@forEach

      val label = info.loadLabel(pm)?.toString() ?: pkg
      if (!appMap.containsKey(pkg)) {
        appMap[pkg] = LaunchableApp(pkg, label, resolveCategory(info))
      }
    }

    return appMap.values.sortedBy { it.label.lowercase(Locale.getDefault()) }
  }

  private fun resolveCategory(info: ResolveInfo): String {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return "Outros"
    }

    val appInfo = info.activityInfo.applicationInfo
    return when (appInfo.category) {
      ApplicationInfo.CATEGORY_GAME -> "Jogos"
      ApplicationInfo.CATEGORY_AUDIO -> "Música & Áudio"
      ApplicationInfo.CATEGORY_VIDEO -> "Vídeo"
      ApplicationInfo.CATEGORY_IMAGE -> "Foto & Vídeo"
      ApplicationInfo.CATEGORY_SOCIAL -> "Redes Sociais"
      ApplicationInfo.CATEGORY_NEWS -> "Notícias"
      ApplicationInfo.CATEGORY_MAPS -> "Mapas & Navegação"
      ApplicationInfo.CATEGORY_PRODUCTIVITY -> "Produtividade"
      else -> "Outros"
    }
  }

  private fun getDefaultHomePackage(): String? {
    val pm = reactContext.packageManager
    val homeIntent = Intent(Intent.ACTION_MAIN).apply {
      addCategory(Intent.CATEGORY_HOME)
    }
    val homeActivity = pm.resolveActivity(homeIntent, 0) ?: return null
    val packageName = homeActivity.activityInfo?.packageName
    return if (packageName == "android") null else packageName
  }

  private fun isServiceEnabled(context: ReactApplicationContext, serviceId: String): Boolean {
    val enabledServices =
        Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
            ?: return false
    return enabledServices.contains(serviceId, ignoreCase = true)
  }

  private fun isAccessibilityServiceEnabled(): Boolean {
    return isServiceEnabled(
        reactContext,
        reactContext.packageName + "/" + BlockerAccessibilityService::class.java.name
    )
  }
}
