package com.cannaai.pro

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.os.Bundle
import androidx.annotation.NonNull

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.cannaai.pro/native"

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Set up method channels for native communication
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler {
            call, result ->
            when (call.method) {
                "getPlatformVersion" -> {
                    result("Android ${android.os.Build.VERSION.RELEASE}")
                }
                "getDeviceInfo" -> {
                    val deviceInfo = mapOf(
                        "model" to android.os.Build.MODEL,
                        "manufacturer" to android.os.Build.MANUFACTURER,
                        "version" to android.os.Build.VERSION.RELEASE,
                        "sdk" to android.os.Build.VERSION.SDK_INT
                    )
                    result(deviceInfo)
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Configure themes for status/navigation bars
        window.statusBarColor = android.graphics.Color.parseColor("#16a34a")
        window.navigationBarColor = android.graphics.Color.parseColor("#16a34a")

        // Set light status bar (dark icons) for better contrast
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            window.decorView.systemUiVisibility =
                window.decorView.systemUiVisibility or android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }
    }

    override fun onResume() {
        super.onResume()
        // Handle app resume events
    }

    override fun onPause() {
        super.onPause()
        // Handle app pause events
    }
}