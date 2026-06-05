import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

class PushNotificationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  
  // Stream controller to notify listeners when a notification with a redirect path is clicked
  final StreamController<String> _redirectStreamController = StreamController<String>.broadcast();
  Stream<String> get redirectStream => _redirectStreamController.stream;

  Future<void> initialize() async {
    try {
      // 1. Request permissions
      NotificationSettings settings = await _fcm.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (kDebugMode) {
        print('User granted permission: ${settings.authorizationStatus}');
      }

      // 2. Fetch token for debugging/backend syncing
      String? token = await _fcm.getToken();
      if (kDebugMode) {
        print('FCM Token: $token');
      }

      // 3. Handle messages when the app is in the foreground
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        if (kDebugMode) {
          print('Got a message in the foreground: ${message.messageId}');
          print('Message data: ${message.data}');
        }
        
        // You could trigger a local notification or show an in-app banner here
        if (message.notification != null) {
          if (kDebugMode) {
            print('Message also contained a notification: ${message.notification?.title}');
          }
        }
      });

      // 4. Handle notification clicks when app is in background but not terminated
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        if (kDebugMode) {
          print('Notification clicked (App was in background): ${message.messageId}');
        }
        _handleNotificationClick(message);
      });

      // 5. Check if the app was opened from a terminated state via a notification
      RemoteMessage? initialMessage = await _fcm.getInitialMessage();
      if (initialMessage != null) {
        if (kDebugMode) {
          print('Notification clicked (App was terminated): ${initialMessage.messageId}');
        }
        _handleNotificationClick(initialMessage);
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error initializing Firebase Messaging: $e');
      }
    }
  }

  void _handleNotificationClick(RemoteMessage message) {
    // Expecting a "path" key in the data payload (e.g. "/products/silk-saree-1")
    final String? redirectPath = message.data['path'];
    if (redirectPath != null && redirectPath.isNotEmpty) {
      _redirectStreamController.add(redirectPath);
    }
  }

  void dispose() {
    _redirectStreamController.close();
  }
}
