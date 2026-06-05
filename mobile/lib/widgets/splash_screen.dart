import 'package:flutter/material.dart';

class SplashScreen extends StatelessWidget {
  final bool visible;

  const SplashScreen({super.key, required this.visible});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: !visible,
      child: AnimatedOpacity(
        opacity: visible ? 1.0 : 0.0,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
        child: Container(
          color: Colors.white, // Pure white background to match the splash logo asset
          child: Stack(
            children: [
              // Centered Brand Logo
              Center(
                child: Hero(
                  tag: 'app_logo',
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 200,
                    height: 200,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              // Subtitle/Footer
              Positioned(
                bottom: 48,
                left: 0,
                right: 0,
                child: Column(
                  children: [
                    const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF8B0030)),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'PREMIUM SILK SAREES',
                      style: TextStyle(
                        color: Colors.grey.shade500,
                        fontSize: 12,
                        letterSpacing: 3,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
