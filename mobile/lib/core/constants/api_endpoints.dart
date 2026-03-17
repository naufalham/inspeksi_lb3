class ApiEndpoints {
  static const String baseUrl = 'http://10.0.2.2:3001/api';

  // Auth
  static const String login = '/auth/login';
  static const String me = '/auth/me';
  static const String logout = '/auth/logout';

  // Warehouses
  static const String warehouses = '/gudang';
  static String warehouseById(String id) => '/gudang/$id';

  // Inspections
  static const String inspections = '/inspeksi';
  static String inspectionById(String id) => '/inspeksi/$id';
  static String startInspection(String id) => '/inspeksi/$id/mulai';
  static String completeInspection(String id) => '/inspeksi/$id/selesai';
  static String checklistResults(String id) => '/inspeksi/$id/checklist';
  static String findings(String id) => '/inspeksi/$id/temuan';
  static String updateFinding(String inspId, String findId) =>
      '/inspeksi/$inspId/temuan/$findId';
  static String photos(String id) => '/inspeksi/$id/foto';

  // Templates
  static const String checklistTemplates = '/checklist-template';

  // Reports/Dashboard
  static const String statistics = '/laporan/statistik';
}
