#!/usr/bin/env dart

import 'dart:io';
import 'dart:convert';
import 'package:process_run/process_run.dart';

/// Production build script for CannaAI Pro
/// Handles release builds with obfuscation, signing, and version management
class BuildRelease {
  static const String _keystorePath = 'android/app/keystore.jks';
  static const String _keyAlias = 'canna_ai_key';
  static const String _keystorePasswordEnv = 'KEYSTORE_PASSWORD';
  static const String _keyPasswordEnv = 'KEY_PASSWORD';

  Future<void> build({bool obfuscate = true, String? flavor}) async {
    print('🚀 Starting CannaAI Pro Release Build...');

    // Validate environment
    await _validateEnvironment();

    // Clean previous builds
    await _cleanProject();

    // Get version info
    final version = await _getVersionInfo();
    print('📦 Building version: ${version['name']} (${version['code']})');

    // Update version files
    await _updateVersionFiles(version);

    // Generate assets
    await _generateAssets();

    // Build based on platform
    if (Platform.isAndroid) {
      await _buildAndroid(version, obfuscate: obfuscate, flavor: flavor);
    } else if (Platform.isIOS) {
      await _buildIos(version, obfuscate: obfuscate, flavor: flavor);
    }

    // Post-build verification
    await _verifyBuild();

    print('✅ Build completed successfully!');
  }

  Future<void> _validateEnvironment() async {
    print('🔍 Validating build environment...');

    // Check Flutter installation
    final flutterVersion = await Process.run('flutter', ['--version']);
    if (flutterVersion.exitCode != 0) {
      throw Exception('Flutter not found or not working properly');
    }

    // Check Android SDK for Android builds
    if (Platform.isAndroid) {
      final androidHome = Platform.environment['ANDROID_HOME'] ??
                         Platform.environment['ANDROID_SDK_ROOT'];
      if (androidHome == null) {
        throw Exception('ANDROID_HOME not set');
      }
      print('✅ Android SDK found at: $androidHome');
    }

    // Check keystore for release builds
    if (Platform.isAndroid && !File(_keystorePath).existsSync()) {
      print('⚠️  Keystore not found at $_keystorePath');
      print('   Creating debug keystore for testing...');
      await _createDebugKeystore();
    }

    // Check environment variables
    final keystorePassword = Platform.environment[_keystorePasswordEnv];
    if (keystorePassword == null) {
      print('⚠️  $_keystorePasswordEnv not set');
    }

    print('✅ Environment validation complete');
  }

  Future<void> _cleanProject() async {
    print('🧹 Cleaning project...');

    final commands = [
      'flutter clean',
      'rm -rf build/',
      'rm -rf .dart_tool/',
      'dart pub get',
      'flutter pub get',
    ];

    for (final command in commands) {
      await run(command, verbose: false);
    }

    print('✅ Project cleaned');
  }

  Future<Map<String, String>> _getVersionInfo() async {
    // Read from pubspec.yaml
    final pubspecFile = File('pubspec.yaml');
    final content = await pubspecFile.readAsString();

    // Simple version extraction
    final versionMatch = RegExp(r'version:\s*(.+)').firstMatch(content);
    final versionLine = versionMatch?.group(1) ?? '1.0.0+1';
    final parts = versionLine.split('+');

    return {
      'name': parts[0],
      'code': parts[1],
      'full': versionLine,
    };
  }

  Future<void> _updateVersionFiles(Map<String, String> version) async {
    // Update Android version
    final androidGradle = File('android/app/build.gradle');
    if (androidGradle.existsSync()) {
      String content = await androidGradle.readAsString();
      content = content.replaceAll(
        RegExp(r'versionCode\s+\d+'),
        'versionCode ${version['code']}',
      );
      content = content.replaceAll(
        RegExp(r'versionName\s+["\'][^"\']+["\']'),
        'versionName "${version['name']}"',
      );
      await androidGradle.writeAsString(content);
    }

    // Update iOS version
    final iosPlist = File('ios/Runner/Info.plist');
    if (iosPlist.existsSync()) {
      String content = await iosPlist.readAsString();
      content = content.replaceAll(
        RegExp(r'<key>CFBundleShortVersionString<\/key>\s*<string>[^<]+<\/string>'),
        '<key>CFBundleShortVersionString</key>\n\t<string>${version['name']}</string>',
      );
      content = content.replaceAll(
        RegExp(r'<key>CFBundleVersion<\/key>\s*<string>[^<]+<\/string>'),
        '<key>CFBundleVersion</key>\n\t<string>${version['code']}</string>',
      );
      await iosPlist.writeAsString(content);
    }
  }

  Future<void> _generateAssets() async {
    print('🎨 Generating assets...');

    // Generate localization
    await run('flutter gen-l10n');

    // Generate icons if needed
    if (!File('assets/icons/app_icon.png').existsSync()) {
      print('⚠️  App icon not found, skipping icon generation');
    }

    // Build runner for generated files
    await run('dart run build_runner build --delete-conflicting-outputs');

    print('✅ Assets generated');
  }

  Future<void> _buildAndroid(
    Map<String, String> version, {
    bool obfuscate = true,
    String? flavor,
  }) async {
    print('🤖 Building Android release...');

    final buildCommand = <String>[
      'flutter',
      'build',
      'apk',
      '--release',
      if (obfuscate) '--obfuscate',
      if (obfuscate) '--split-debug-info=build/debug-info/',
      if (obfuscate) '--split-debug-info-for-release',
      if (flavor != null) '--flavor=$flavor',
      '--dart-define=FLUTTER_WEB_CANVASKIT_URL=https://www.gstatic.com/flutter-canvaskit/',
    ];

    if (File(_keystorePath).existsSync()) {
      final keystorePassword = Platform.environment[_keystorePasswordEnv] ?? '';
      final keyPassword = Platform.environment[_keyPasswordEnv] ?? '';

      if (keystorePassword.isNotEmpty && keyPassword.isNotEmpty) {
        buildCommand.addAll([
          '--signing-key=$_keystorePath',
          '--signing-key-alias=$_keyAlias',
          '--signing-key-pass=$keyPassword',
          '--signing-store-pass=$keystorePassword',
        ]);
      }
    }

    final result = await Process.run(buildCommand.first, buildCommand.skip(1).toList());

    if (result.exitCode != 0) {
      print('❌ Android build failed:');
      print(result.stderr);
      throw Exception('Android build failed');
    }

    // Move APK to distribution folder
    final distDir = Directory('dist');
    if (!distDir.existsSync()) {
      await distDir.create();
    }

    final apkFiles = await Directory('build/app/outputs/flutter-apk/')
        .list()
        .where((f) => f.path.endsWith('.apk'))
        .cast<File>()
        .toList();

    for (final apk in apkFiles) {
      final newName = 'canna_ai_${version['name']}_${apk.path.split('/').last}';
      await apk.rename('dist/$newName');
    }

    print('✅ Android build completed');
    print('📱 APKs available in dist/ folder');
  }

  Future<void> _buildIos(
    Map<String, String> version, {
    bool obfuscate = true,
    String? flavor,
  }) async {
    print('🍎 Building iOS release...');

    // Build framework
    final buildCommand = <String>[
      'flutter',
      'build',
      'ios',
      '--release',
      if (obfuscate) '--obfuscate',
      if (obfuscate) '--split-debug-info=build/debug-info/',
      if (flavor != null) '--flavor=$flavor',
    ];

    final result = await Process.run(buildCommand.first, buildCommand.skip(1).toList());

    if (result.exitCode != 0) {
      print('❌ iOS build failed:');
      print(result.stderr);
      throw Exception('iOS build failed');
    }

    // Archive and export
    await _archiveAndExportIos(version);

    print('✅ iOS build completed');
  }

  Future<void> _archiveAndExportIos(Map<String, String> version) async {
    // Change to ios directory
    Directory.current = Directory('ios');

    try {
      // Archive
      await run(
        'xcodebuild -workspace Runner.xcworkspace -scheme Runner -configuration Release archive -archivePath build/Runner.xcarchive',
      );

      // Export IPA
      await run(
        'xcodebuild -exportArchive -archivePath build/Runner.xcarchive -exportPath build/Runner -exportOptionsPlist ExportOptions.plist',
      );

    } finally {
      Directory.current = Directory('..');
    }
  }

  Future<void> _createDebugKeystore() async {
    print('🔐 Creating debug keystore...');

    await run(
      'keytool -genkey -v -keystore $_keystorePath -alias $_keyAlias -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=CannaAI Debug, OU=Development, O=CannaAI, L=City, ST=State, C=US"',
    );
  }

  Future<void> _verifyBuild() async {
    print('🔍 Verifying build...');

    final distDir = Directory('dist');
    if (distDir.existsSync()) {
      final files = await distDir.list().toList();
      print('📦 Generated files:');
      for (final file in files) {
        print('   ${file.path.split('/').last}');
      }
    }

    // Check build size
    final buildDir = Directory('build');
    if (buildDir.existsSync()) {
      final size = await _calculateDirectorySize(buildDir);
      print('📊 Build size: ${(size / (1024 * 1024)).toStringAsFixed(2)} MB');
    }

    print('✅ Build verification complete');
  }

  Future<int> _calculateDirectorySize(Directory dir) async {
    int size = 0;
    await for (final entity in dir.list(recursive: true)) {
      if (entity is File) {
        size += await entity.length();
      }
    }
    return size;
  }
}

void main(List<String> args) async {
  final build = BuildRelease();

  try {
    await build.build(
      obfuscate: !args.contains('--no-obfuscate'),
      flavor: args.firstWhere((arg) => arg.startsWith('--flavor='), orElse: () => '').replaceFirst('--flavor=', ''),
    );
  } catch (e) {
    print('❌ Build failed: $e');
    exit(1);
  }
}