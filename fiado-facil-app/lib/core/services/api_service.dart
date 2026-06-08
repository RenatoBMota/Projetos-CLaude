import 'dart:convert';
import 'package:http/http.dart' as http;
import 'storage_service.dart';
import '../constants/api_constants.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);
  @override
  String toString() => message;
}

class ApiService {
  final StorageService _storage;
  ApiService(this._storage);

  Future<Map<String, String>> _headers() async {
    final token = await _storage.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Uri _uri(String path, [Map<String, dynamic>? params]) {
    final base = Uri.parse('${ApiConstants.baseUrl}$path');
    if (params == null) return base;
    final cleaned = <String, String>{};
    params.forEach((k, v) { if (v != null) cleaned[k] = v.toString(); });
    return base.replace(queryParameters: cleaned);
  }

  Future<dynamic> get(String path, [Map<String, dynamic>? params]) async {
    final res = await http.get(_uri(path, params), headers: await _headers());
    return _handle(res);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      _uri(path),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _handle(res);
  }

  Future<dynamic> patch(String path, Map<String, dynamic> body) async {
    final res = await http.patch(
      _uri(path),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _handle(res);
  }

  Future<dynamic> delete(String path) async {
    final res = await http.delete(_uri(path), headers: await _headers());
    return _handle(res);
  }

  dynamic _handle(http.Response res) {
    final body = utf8.decode(res.bodyBytes);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (body.isEmpty) return null;
      return jsonDecode(body);
    }
    String msg = 'Erro ${res.statusCode}';
    try {
      final j = jsonDecode(body);
      msg = j['message'] is List ? (j['message'] as List).first : (j['message'] ?? msg);
    } catch (_) {}
    throw ApiException(msg, res.statusCode);
  }
}
