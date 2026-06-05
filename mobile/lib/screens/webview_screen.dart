import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:file_picker/file_picker.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:firebase_analytics/firebase_analytics.dart';

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
  bool _isAtTop = true; // Tracks if WebView is scrolled to the absolute top
  
  late final StreamSubscription<List<ConnectivityResult>> _connectivitySubscription;
  StreamSubscription<String>? _deepLinkSubscription;

  @override
  void initState() {
    super.initState();
    _initWebViewController();
    _checkInitialConnectivity();
    _subscribeToConnectivity();
    _subscribeToDeepLinks();
    
    // Check app updates after short delay
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAppVersion();
    });
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
      )
      ..setOnScrollPositionChange((ScrollPositionChange change) {
        final atTop = change.y == 0;
        if (atTop != _isAtTop) {
          setState(() {
            _isAtTop = atTop;
          });
        }
      })
      ..addJavaScriptChannel(
        'FlutterAnalytics',
        onMessageReceived: (JavaScriptMessage message) async {
          try {
            final data = jsonDecode(message.message);
            final eventName = data['event'] as String?;
            final params = data['params'] as Map<String, dynamic>?;

            if (eventName != null) {
              final Map<String, Object> cleanParams = {};
              params?.forEach((key, value) {
                if (value is String || value is num || value is bool) {
                  cleanParams[key] = value;
                }
              });

              // Push the analytical event to Firebase Analytics
              await FirebaseAnalytics.instance.logEvent(
                name: eventName,
                parameters: cleanParams.isNotEmpty ? cleanParams : null,
              );

              if (kDebugMode) {
                print('FCM Analytics Event: $eventName $cleanParams');
              }
            }
          } catch (e) {
            if (kDebugMode) {
              print('FCM Analytics parse failure: $e');
            }
          }
        },
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
        final path = urlPath.startsWith('/') ? urlPath : '/$urlPath';
        final base = widget.initialUrl.endsWith('/')
            ? widget.initialUrl.substring(0, widget.initialUrl.length - 1)
            : widget.initialUrl;
        final fullUrl = '$base$path';
            
        _controller.loadRequest(Uri.parse(fullUrl));
      });
    }
  }

  Future<void> _checkAppVersion() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;

      // Make a standard API request to fetch version payload
      final client = HttpClient();
      final request = await client.getUrl(Uri.parse('https://anjalialankaram.com/app-version.json'));
      final response = await request.close();

      if (response.statusCode == HttpStatus.ok) {
        final body = await response.transform(utf8.decoder).join();
        final config = jsonDecode(body);
        
        final latestVersion = config['latestVersion'] as String?;
        final minVersion = config['minVersion'] as String?;
        final updateUrl = config['updateUrl'] as String? ?? 'https://play.google.com/store/apps';

        if (latestVersion != null) {
          final hasForceUpdate = minVersion != null && _isNewerVersion(currentVersion, minVersion);
          final hasUpdate = _isNewerVersion(currentVersion, latestVersion);

          if (hasForceUpdate) {
            _showUpdateDialog(updateUrl, mandatory: true);
          } else if (hasUpdate) {
            _showUpdateDialog(updateUrl, mandatory: false);
          }
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('Version check skipped: $e');
      }
    }
  }

  bool _isNewerVersion(String current, String remote) {
    final currentParts = current.split('.').map(int.tryParse).toList();
    final remoteParts = remote.split('.').map(int.tryParse).toList();
    
    for (int i = 0; i < remoteParts.length; i++) {
      final remoteVal = remoteParts[i] ?? 0;
      final currentVal = i < currentParts.length ? (currentParts[i] ?? 0) : 0;
      if (remoteVal > currentVal) return true;
      if (remoteVal < currentVal) return false;
    }
    return false;
  }

  void _showUpdateDialog(String updateUrl, {required bool mandatory}) {
    showDialog(
      context: context,
      barrierDismissible: !mandatory,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFFFDF5EC),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text(
            'App Update Available',
            style: TextStyle(color: Color(0xFF8B0030), fontWeight: FontWeight.bold),
          ),
          content: Text(
            mandatory
                ? 'A critical update is available. You must update to the latest version to continue shopping.'
                : 'A new version of Anjali Alankaram is available with improvements and new sarees. Update now?',
            style: const TextStyle(color: Colors.black87),
          ),
          actions: <Widget>[
            if (!mandatory)
              TextButton(
                child: const Text('Later', style: TextStyle(color: Colors.grey)),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B0030),
                foregroundColor: const Color(0xFFFDF5EC),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Update Now'),
              onPressed: () async {
                final uri = Uri.tryParse(updateUrl);
                if (uri != null && await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
            ),
          ],
        );
      },
    );
  }

  Future<void> _shareCurrentPage() async {
    try {
      final url = await _controller.currentUrl();
      if (url != null) {
        await Share.share(
          'Take a look at Anjali Alankaram: $url',
          subject: 'Anjali Alankaram Premium Silk Sarees',
        );
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error sharing current page: $e');
      }
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
              // WebView component wrapped with Pull-to-Refresh (Hidden when offline)
              Opacity(
                opacity: _isOffline ? 0.0 : 1.0,
                child: RefreshIndicator(
                  color: const Color(0xFF8B0030),
                  backgroundColor: const Color(0xFFFDF5EC),
                  onRefresh: () async {
                    await _controller.reload();
                  },
                  child: WebViewWidget(
                    controller: _controller,
                    gestureRecognizers: _isAtTop
                        ? {
                            Factory<VerticalDragGestureRecognizer>(
                              () => VerticalDragGestureRecognizer(),
                            ),
                          }
                        : <Factory<VerticalDragGestureRecognizer>>{},
                  ),
                ),
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
        // Floating action button for sharing the current product URL (Hidden during splash or offline)
        floatingActionButton: (!_showSplash && !_isOffline)
            ? FloatingActionButton.small(
                onPressed: _shareCurrentPage,
                backgroundColor: const Color(0xFF8B0030),
                foregroundColor: const Color(0xFFFDF5EC),
                elevation: 4.0,
                shape: const CircleBorder(),
                child: const Icon(Icons.share_rounded),
              )
            : null,
      ),
    );
  }
}
