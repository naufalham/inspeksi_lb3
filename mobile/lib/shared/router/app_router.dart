import 'package:go_router/go_router.dart';
import '../../features/auth/auth_provider.dart';
import '../../features/auth/login_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/gudang/warehouse_list_screen.dart';
import '../../features/gudang/warehouse_detail_screen.dart';
import '../../features/inspeksi/inspection_list_screen.dart';
import '../../features/inspeksi/inspection_form_screen.dart';
import '../widgets/main_shell.dart';

class AppRouter {
  static GoRouter router(AuthProvider auth) {
    return GoRouter(
      initialLocation: '/dashboard',
      refreshListenable: auth,
      redirect: (context, state) {
        if (!auth.initialized) return null;
        final loggedIn = auth.isLoggedIn;
        final onLogin = state.matchedLocation == '/login';
        if (!loggedIn && !onLogin) return '/login';
        if (loggedIn && onLogin) return '/dashboard';
        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          builder: (_, __) => const LoginScreen(),
        ),
        ShellRoute(
          builder: (context, state, child) => MainShell(child: child),
          routes: [
            GoRoute(
              path: '/dashboard',
              builder: (_, __) => const DashboardScreen(),
            ),
            GoRoute(
              path: '/gudang',
              builder: (_, __) => const WarehouseListScreen(),
            ),
            GoRoute(
              path: '/gudang/:id',
              builder: (_, state) => WarehouseDetailScreen(
                wh: state.extra as Map<String, dynamic>,
              ),
            ),
            GoRoute(
              path: '/inspeksi',
              builder: (_, __) => const InspectionListScreen(),
            ),
            GoRoute(
              path: '/inspeksi/:id/lakukan',
              builder: (_, state) => InspectionFormScreen(
                inspectionId: state.pathParameters['id']!,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
