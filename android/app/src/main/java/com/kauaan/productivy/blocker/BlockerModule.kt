package com.kauaan.productivy.blocker

import android.content.Intent
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
  fun getInstalledApps(promise: Promise) {
    try {
      val pm = reactContext.packageManager
      val intent = Intent(Intent.ACTION_MAIN, null).apply {
        addCategory(Intent.CATEGORY_LAUNCHER)
      }
      val resolveInfos = pm.queryIntentActivities(intent, 0)
      
      // Map: PackageName -> { Label, Category }
      val appMap = LinkedHashMap<String, Pair<String, String>>()
      
      resolveInfos.forEach { info ->
        val pkg = info.activityInfo.packageName ?: return@forEach
        if (pkg == reactContext.packageName) return@forEach
        
        val label = info.loadLabel(pm)?.toString() ?: pkg
        
        if (!appMap.containsKey(pkg)) {
            // Determine Category
            var category = "Outros"
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                val appInfo = info.activityInfo.applicationInfo
                category = when (appInfo.category) {
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
            appMap[pkg] = Pair(label, category)
        }
      }
      
      val launchable = appMap.entries
          .sortedBy { it.value.first.lowercase(Locale.getDefault()) }

      val result = Arguments.createArray()
      launchable.forEach { (pkg, data) ->
        val map = Arguments.createMap()
        map.putString("packageName", pkg)
        map.putString("label", data.first)
        map.putString("category", data.second)
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

  private fun isServiceEnabled(context: ReactApplicationContext, serviceId: String): Boolean {
    val enabledServices =
        Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
            ?: return false
    return enabledServices.contains(serviceId, ignoreCase = true)
  }
}
