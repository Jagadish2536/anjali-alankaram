import 'package:flutter_test/flutter_test.dart';
import 'package:anjali_alankaram_mobile/main.dart';
import 'package:anjali_alankaram_mobile/screens/webview_screen.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const AnjaliAlankaramApp());

    // Verify WebViewScreen is present
    expect(find.byType(WebViewScreen), findsOneWidget);
  });
}
