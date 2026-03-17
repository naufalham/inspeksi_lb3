import 'package:flutter/foundation.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';

class InspectionProvider extends ChangeNotifier {
  List<dynamic> _inspections = [];
  bool _loading = false;
  String? _error;

  List<dynamic> get inspections => _inspections;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> load({String? status}) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final q = status != null ? '?status=$status' : '';
      final r = await ApiClient().get('${ApiEndpoints.inspections}$q');
      _inspections = (r['data'] as List?) ?? [];
    } catch (e) {
      _error = e.toString();
    }
    _loading = false;
    notifyListeners();
  }
}
