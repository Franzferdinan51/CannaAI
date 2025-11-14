# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Flutter specific rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Flutter wrapper
-keep class androidx.lifecycle.** { *; }

# Don't obfuscate main application class
-keep class com.cannaai.pro.MainActivity { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keepclassmembers class * {
    @com.google.firebase.messaging.Encrypted <fields>;
}
-dontwarn com.google.firebase.**

# WorkManager
-keep class androidx.work.** { *; }
-keep class * extends androidx.work.Worker
-keepclassmembers class * extends androidx.work.Worker {
    public <init>(android.content.Context,androidx.work.WorkerParameters);
}

# Room database
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-keep @androidx.room.Dao class *
-dontwarn androidx.room.paging.**

# Camera2 API
-keep class android.hardware.camera2.** { *; }
-keep class androidx.camera.** { *; }

# Bluetooth
-keep class android.bluetooth.** { *; }
-keep class androidx.bluetooth.** { *; }

# Gson for JSON parsing
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Network libraries (Retrofit, OkHttp)
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# OkHttp
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.* { *; }
-keep interface okhttp3.* { *; }
-dontwarn okhttp3.**

# Okio
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepnames class okio.*
-keep class okio.* { *; }

# Socket.IO
-keep class io.socket.** { *; }
-dontwarn io.socket.**

# Shared preferences encryption
-keep class androidx.security.crypto.** { *; }

# Biometric authentication
-keep class androidx.biometric.** { *; }

# Material Design components
-keep class com.google.android.material.** { *; }

# Charts and visualization
-keep class com.github.mikephil.charting.** { *; }
-keep class syncfusion.** { *; }

# Lottie animations
-keep class com.airbnb.lottie.** { *; }

# QR Code scanning
-keep class com.google.zxing.** { *; }
-dontwarn com.journeyapps.barcodescanner.**

# Image processing
-keep class androidx.exifinterface.** { *; }

# File provider
-keep class androidx.core.content.FileProvider { *; }

# Permission handling
-keep class androidx.core.app.** { *; }
-keep class androidx.core.content.** { *; }

# Local notifications
-keep class androidx.core.app.NotificationCompat { *; }
-keep class androidx.core.app.NotificationManagerCompat { *; }

# Keep model classes
-keep class com.cannaai.pro.**.model.** { *; }
-keep class com.cannaai.pro.**.dto.** { *; }
-keep class com.cannaai.pro.**.entity.** { *; }

# Keep providers
-keep class com.cannaai.pro.**.provider.** { *; }

# Keep services
-keep class com.cannaai.pro.**.service.** { *; }

# Keep receivers
-keep class com.cannaai.pro.**.receiver.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep custom views
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
    public void set*(...);
    *** get*();
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Keep Serializable implementations
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep R class
-keepclassmembers class **.R$* {
    public static <fields>;
}

# Keep BuildConfig
-keepclassmembers class **.BuildConfig {
    public *;
}

# Optimization flags
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification
-dontpreverify

# Remove logging in release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# Keep annotation classes
-keepattributes *Annotation*

# Keep line numbers for debugging
-keepattributes SourceFile,LineNumberTable

# Preserve the original line numbers in stack traces
-renamesourcefileattribute SourceFile

# Keep method signatures for reflection
-keepattributes Signature,InnerClasses,EnclosingMethod

# Keep native libraries
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep JNI classes and methods
-keepclasseswithmembernames class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# Keep all custom exception classes
-keep public class * extends java.lang.Exception