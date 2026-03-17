import 'package:flutter/foundation.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/secure_storage.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();
  final SecureStorage _storage = SecureStorage();

  Map<String, dynamic>? _user;
  bool _loading = false;
  String? _error;
  bool _initialized = false;

  Map<String, dynamic>? get user => _user;
  bool get loading => _loading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;
  bool get isAdmin => _user?['role'] == 'admin';
  bool get initialized => _initialized;

  Future<void> init() async {
    _user = await _storage.getUser();
    _initialized = true;
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _api.post(ApiEndpoints.login, {
        'username': username,
        'password': password,
      });
      final data = result['data'];
      await _storage.saveTokens(data['accessToken'], data['refreshToken']);
      await _storage.saveUser(Map<String, dynamic>.from(data['user']));
      _user = Map<String, dynamic>.from(data['user']);
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken != null) {
        await _api.post(ApiEndpoints.logout, {'refreshToken': refreshToken});
      }
    } catch (_) {}
    await _storage.clear();
    _user = null;
    notifyListeners();
  }
}
