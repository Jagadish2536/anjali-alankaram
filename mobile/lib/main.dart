import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:app_links/app_links.dart';

import 'screens/webview_screen.dart';
import 'services/push_notification_service.dart';

// Global stream controller for incoming redirects (deep links and notifications)
final StreamController<String> _navigationStreamController = StreamController<String>.broadcast();
Stream<String> get navigationStream => _navigationStreamController.stream;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final pushNotificationService = PushNotificationService();

  // Try initializing Firebase (may fail if configuration files aren't added yet)
  try {
    await Firebase.initializeApp();
    await pushNotificationService.initialize();
    
    // Listen to push notification clicks and redirect accordingly
    pushNotificationService.redirectStream.listen((path) {
      _navigationStreamController.add(path);
    });
  } catch (e) {
    if (kDebugMode) {
      print('Firebase initialization skipped/failed: $e');
      print('Make sure to add google-services.json (Android) and GoogleService-Info.plist (iOS) to enable push notifications.');
    }
  }

  // Initialize Deep Links
  _initDeepLinks();

  runApp(const AnjaliAlankaramApp());
}

void _initDeepLinks() async {
  final appLinks = AppLinks();
  
  // Get initial link if app was launched via link
  try {
    final uri = await appLinks.getInitialLink();
    if (uri != null) {
      _navigationStreamController.add(uri.path);
    }
  } catch (e) {
    if (kDebugMode) {
      print('Error getting initial deep link: $e');
    }
  }

  // Listen to incoming deep links while app is running
  appLinks.uriLinkStream.listen((uri) {
    _navigationStreamController.add(uri.path);
  }, onError: (err) {
    if (kDebugMode) {
      print('Error listening to deep links: $err');
    }
  });
}

class AnjaliAlankaramApp extends StatelessWidget {
  const AnjaliAlankaramApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Anjali Alankaram',
      theme: ThemeData(
        primaryColor: const Color(0xFF8B0030), // Burgundy brand color
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF8B0030),
          primary: const Color(0xFF8B0030),
          secondary: const Color(0xFFB76E79), // Rose gold
        ),
        useMaterial3: true,
      ),
      // Set the home screen to navigate to the website
      home: WebViewScreen(
        initialUrl: 'https://anjalialankaram.com',
        deepLinkStream: navigationStream,
      ),
      debugShowCheckedModeBanner: false,
    );
  }
}
