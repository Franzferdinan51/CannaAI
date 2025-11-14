import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../../features/automation/presentation/pages/automation_page.dart';
import '../../features/analytics/presentation/pages/analytics_page.dart';
import '../../features/plant_analysis/presentation/pages/plant_analysis_page.dart';
import '../../features/strains/presentation/pages/strains_page.dart';
import '../../features/settings/presentation/pages/settings_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/splash/presentation/pages/splash_page.dart';

// Navigation provider
final appRouterProvider = Provider<AppRouter>((ref) {
  return AppRouter();
});

class AppRouter {
  static const String splash = '/splash';
  static const String login = '/login';
  static const String dashboard = '/dashboard';
  static const String automation = '/automation';
  static const String analytics = '/analytics';
  static const String analysis = '/analysis';
  static const String strains = '/strains';
  static const String settings = '/settings';

  static final GoRouter _router = GoRouter(
    initialLocation: splash,
    debugLogDiagnostics: true,

    routes: [
      // Splash screen
      GoRoute(
        path: splash,
        name: 'splash',
        builder: (context, state) => const SplashPage(),
      ),

      // Authentication routes
      GoRoute(
        path: login,
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),

      // Main app with shell navigation (bottom navigation)
      ShellRoute(
        builder: (context, state, child) {
          return MainNavigationShell(child: child);
        },
        routes: [
          // Dashboard
          GoRoute(
            path: dashboard,
            name: 'dashboard',
            builder: (context, state) => const DashboardPage(),
          ),

          // Automation
          GoRoute(
            path: automation,
            name: 'automation',
            builder: (context, state) => const AutomationPage(),
          ),

          // Analytics
          GoRoute(
            path: analytics,
            name: 'analytics',
            builder: (context, state) => const AnalyticsPage(),
          ),

          // Plant Analysis
          GoRoute(
            path: analysis,
            name: 'analysis',
            builder: (context, state) => const PlantAnalysisPage(),
          ),

          // Strains
          GoRoute(
            path: strains,
            name: 'strains',
            builder: (context, state) => const StrainsPage(),
          ),

          // Settings
          GoRoute(
            path: settings,
            name: 'settings',
            builder: (context, state) => const SettingsPage(),
          ),
        ],
      ),
    ],

    // Error handling
    errorBuilder: (context, state) => ErrorPage(error: state.error),

    // Redirect logic
    redirect: (context, state) {
      // TODO: Add authentication logic here
      // For now, we'll go directly to dashboard after splash
      if (state.location == splash) {
        return dashboard; // Skip login for now
      }
      return null;
    },
  );

  GoRouter get router => _router;
}

// Shell navigation widget with bottom navigation
class MainNavigationShell extends ConsumerStatefulWidget {
  final Widget child;

  const MainNavigationShell({
    super.key,
    required this.child,
  });

  @override
  ConsumerState<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends ConsumerState<MainNavigationShell> {
  int _selectedIndex = 0;

  static const List<NavigationDestination> _destinations = [
    NavigationDestination(
      icon: Icon(Icons.dashboard_outlined),
      selectedIcon: Icon(Icons.dashboard),
      label: 'Dashboard',
    ),
    NavigationDestination(
      icon: Icon(Icons.auto_awesome_outlined),
      selectedIcon: Icon(Icons.auto_awesome),
      label: 'Automation',
    ),
    NavigationDestination(
      icon: Icon(Icons.analytics_outlined),
      selectedIcon: Icon(Icons.analytics),
      label: 'Analytics',
    ),
    NavigationDestination(
      icon: Icon(Icons.photo_camera_outlined),
      selectedIcon: Icon(Icons.photo_camera),
      label: 'Analysis',
    ),
    NavigationDestination(
      icon: Icon(Icons.grass_outlined),
      selectedIcon: Icon(Icons.grass),
      label: 'Strains',
    ),
    NavigationDestination(
      icon: Icon(Icons.settings_outlined),
      selectedIcon: Icon(Icons.settings),
      label: 'Settings',
    ),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });

    final String route;
    switch (index) {
      case 0:
        route = AppRouter.dashboard;
        break;
      case 1:
        route = AppRouter.automation;
        break;
      case 2:
        route = AppRouter.analytics;
        break;
      case 3:
        route = AppRouter.analysis;
        break;
      case 4:
        route = AppRouter.strains;
        break;
      case 5:
        route = AppRouter.settings;
        break;
      default:
        return;
    }

    context.go(route);
  }

  @override
  Widget build(BuildContext context) {
    final String location = GoRouterState.of(context).location;

    // Update selected index based on current route
    switch (location) {
      case AppRouter.dashboard:
        _selectedIndex = 0;
        break;
      case AppRouter.automation:
        _selectedIndex = 1;
        break;
      case AppRouter.analytics:
        _selectedIndex = 2;
        break;
      case AppRouter.analysis:
        _selectedIndex = 3;
        break;
      case AppRouter.strains:
        _selectedIndex = 4;
        break;
      case AppRouter.settings:
        _selectedIndex = 5;
        break;
    }

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _onItemTapped,
        destinations: _destinations,
        height: 65,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),
    );
  }
}

// Error page
class ErrorPage extends StatelessWidget {
  final Exception? error;

  const ErrorPage({super.key, this.error});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Error'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red,
              ),
              const SizedBox(height: 16),
              const Text(
                'Oops! Something went wrong.',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                error?.toString() ?? 'Unknown error occurred',
                style: const TextStyle(fontSize: 16),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => context.go(AppRouter.dashboard),
                child: const Text('Go to Dashboard'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}