import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:file_picker/file_picker.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../widgets/splash_screen.dart';
import '../widgets/offline_screen.dart';

class WebViewScreen extends StatefulWidget {
  final String initialUrl;
  final Stream<String>? deepLinkStream;

  const WebViewScreen({
    super.key,
    required this.initialUrl,
    this.deepLinkStream,
  });

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isOffline = false;
  bool _showSplash = true;
  double _loadingProgress = 0.0;
  
  late final StreamSubscription<List<ConnectivityResult>> _connectivitySubscription;
  StreamSubscription<String>? _deepLinkSubscription;

  @override
  void initState() {
    super.initState();
    _initWebViewController();
    _checkInitialConnectivity();
    _subscribeToConnectivity();
    _subscribeToDeepLinks();
  }

  void _initWebViewController() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            setState(() {
              _loadingProgress = progress / 100.0;
            });
          },
          onPageStarted: (String url) {
            // Keep splash visible
          },
          onPageFinished: (String url) {
            setState(() {
              _showSplash = false;
            });
          },
          onWebResourceError: (WebResourceError error) {
            if (kDebugMode) {
              print('WebView Resource Error: ${error.description}');
            }
          },
          onNavigationRequest: (NavigationRequest request) async {
            final url = request.url;
            
            // Intercept WhatsApp links
            if (url.startsWith('whatsapp://') ||
                url.startsWith('https://wa.me/') ||
                url.startsWith('https://api.whatsapp.com/')) {
              final uri = Uri.tryParse(url);
              if (uri != null) {
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Could not launch WhatsApp')),
                  );
                }
              }
              return NavigationDecision.prevent;
            }

            // Intercept standard phone call, sms and mail links
            if (url.startsWith('tel:') || url.startsWith('mailto:') || url.startsWith('sms:')) {
              final uri = Uri.tryParse(url);
              if (uri != null && await canLaunchUrl(uri)) {
                await launchUrl(uri);
              }
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
        ),
      );

    // Setup android-specific file selector
    if (Platform.isAndroid) {
      final androidController = _controller.platform as AndroidWebViewController;
      androidController.setOnShowFileSelector((FileSelectorParams params) async {
        try {
          final result = await FilePicker.platform.pickFiles(
            allowMultiple: params.acceptMultiple,
            type: FileType.any,
          );

          if (result != null) {
            return result.files
                .where((file) => file.path != null)
                .map((file) => file.path!)
                .toList();
          }
        } catch (e) {
          if (kDebugMode) {
            print('Error in file chooser: $e');
          }
        }
        return [];
      });
    }

    _controller.loadRequest(Uri.parse(widget.initialUrl));
  }

  Future<void> _checkInitialConnectivity() async {
    final results = await Connectivity().checkConnectivity();
    _updateConnectivityState(results);
  }

  void _subscribeToConnectivity() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      _updateConnectivityState(results);
    });
  }

  void _updateConnectivityState(List<ConnectivityResult> results) {
    final offline = results.contains(ConnectivityResult.none) || results.isEmpty;
    if (offline != _isOffline) {
      setState(() {
        _isOffline = offline;
      });
      if (!offline) {
        _controller.reload();
      }
    }
  }

  void _subscribeToDeepLinks() {
    if (widget.deepLinkStream != null) {
      _deepLinkSubscription = widget.deepLinkStream!.listen((urlPath) {
        if (kDebugMode) {
          print('Deep link triggered navigation to: $urlPath');
        }
        
        // Ensure path starts with a slash
        final path = urlPath.startsWith('/') ? urlPath : '/$path';
        final fullUrl = widget.initialUrl.endsWith('/')
            ? '${widget.initialUrl.substring(0, widget.initialUrl.length - 1)}$path'
            : '$widget.initialUrl$path';
            
        _controller.loadRequest(Uri.parse(fullUrl));
      });
    }
  }

  Future<void> _retryConnection() async {
    final results = await Connectivity().checkConnectivity();
    _updateConnectivityState(results);
    if (!_isOffline) {
      _controller.reload();
    }
  }

  @override
  void dispose() {
    _connectivitySubscription.cancel();
    _deepLinkSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          await _controller.goBack();
        } else {
          // Exit app if no web history back exists
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Stack(
            children: [
              // WebView component (Hidden when offline)
              Opacity(
                opacity: _isOffline ? 0.0 : 1.0,
                child: WebViewWidget(controller: _controller),
              ),

              // Progress Indicator (Only when page is loading and splash is gone)
              if (!_showSplash && _loadingProgress < 1.0 && !_isOffline)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  child: LinearProgressIndicator(
                    value: _loadingProgress,
                    backgroundColor: Colors.transparent,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF8B0030)),
                  ),
                ),

              // Offline Screen overlay
              if (_isOffline)
                OfflineScreen(onRetry: _retryConnection),

              // Splash Screen overlay
              SplashScreen(visible: _showSplash && !_isOffline),
            ],
          ),
        ),
      ),
    );
  }
}
