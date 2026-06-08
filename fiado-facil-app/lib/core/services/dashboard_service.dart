import 'api_service.dart';
import '../constants/api_constants.dart';
import '../models/dashboard.dart';

class DashboardService {
  final ApiService _api;
  DashboardService(this._api);

  Future<DashboardResumo> resumo() async {
    final res = await _api.get(ApiConstants.dashboard);
    return DashboardResumo.fromJson(res);
  }
}
