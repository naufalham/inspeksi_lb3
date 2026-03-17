import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../constants/api_endpoints.dart';
import '../storage/secure_storage.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);
  @override
  String toString() => message;
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  final SecureStorage _storage = SecureStorage();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.getAccessToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<bool> _tryRefresh() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null) return false;
      final response = await http.post(
        Uri.parse('${ApiEndpoints.baseUrl}${ApiEndpoints.refresh}'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body)['data'];
        await _storage.saveTokens(data['accessToken'], data['refreshToken']);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  dynamic _parseResponse(http.Response response) {
    final body = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }
    throw ApiException(
      body['message'] ?? 'Terjadi kesalahan',
      response.statusCode,
    );
  }

  Future<dynamic> get(String path) async {
    var headers = await _getHeaders();
    var response = await http.get(
      Uri.parse('${ApiEndpoints.baseUrl}$path'),
      headers: headers,
    );
    if (response.statusCode == 401) {
      if (await _tryRefresh()) {
        headers = await _getHeaders();
        response = await http.get(
          Uri.parse('${ApiEndpoints.baseUrl}$path'),
          headers: headers,
        );
      }
    }
    return _parseResponse(response);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    var headers = await _getHeaders();
    var response = await http.post(
      Uri.parse('${ApiEndpoints.baseUrl}$path'),
      headers: headers,
      body: jsonEncode(body),
    );
    if (response.statusCode == 401) {
      if (await _tryRefresh()) {
        headers = await _getHeaders();
        response = await http.post(
          Uri.parse('${ApiEndpoints.baseUrl}$path'),
          headers: headers,
          body: jsonEncode(body),
        );
      }
    }
    return _parseResponse(response);
  }

  Future<dynamic> put(String path, Map<String, dynamic> body) async {
    var headers = await _getHeaders();
    var response = await http.put(
      Uri.parse('${ApiEndpoints.baseUrl}$path'),
      headers: headers,
      body: jsonEncode(body),
    );
    if (response.statusCode == 401) {
      if (await _tryRefresh()) {
        headers = await _getHeaders();
        response = await http.put(
          Uri.parse('${ApiEndpoints.baseUrl}$path'),
          headers: headers,
          body: jsonEncode(body),
        );
      }
    }
    return _parseResponse(response);
  }

  Future<dynamic> postMultipart(String path, File file,
      {String field = 'photo'}) async {
    final token = await _storage.getAccessToken();
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('${ApiEndpoints.baseUrl}$path'),
    );
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.files.add(await http.MultipartFile.fromPath(field, file.path));
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    return _parseResponse(response);
  }
}
