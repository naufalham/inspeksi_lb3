class ApiEndpoints {
  // Default: emulator localhost
  // Untuk HP fisik lokal: --dart-define=API_BASE_URL=http://192.168.1.x:5000/api
  // Untuk production: --dart-define=API_BASE_URL=https://inspeksipro-backend-production.up.railway.app/api
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api',
  );

  // Auth
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String me = '/auth/me';
  static const String logout = '/auth/logout';

  // Warehouses
  static const String warehouses = '/warehouses';
  static String warehouseById(String id) => '/warehouses/$id';

  // Inspections
  static const String inspections = '/inspections';
  static String inspectionById(String id) => '/inspections/$id';
  static String startInspection(String id) => '/inspections/$id/start';
  static String completeInspection(String id) => '/inspections/$id/complete';
  static String checklistResults(String id) => '/inspections/$id/checklist';
  static String findings(String id) => '/inspections/$id/findings';
  static String updateFinding(String inspId, String findId) =>
      '/inspections/$inspId/findings/$findId';
  static String photos(String id) => '/inspections/$id/photos';

  // Templates
  static const String checklistTemplates = '/checklist-templates';
  static String checklistTemplatesByType(String type) => '/checklist-templates?type=$type';

  // Users
  static const String users = '/users';
  static String userById(String id) => '/users/$id';

  // Reports/Dashboard
  static const String statistics = '/reports/dashboard';
  static const String reportsDashboard = '/reports/dashboard';
  static String inspectionFindings(String id) => '/inspections/$id/findings';
  static String inspectionPhotos(String id) => '/inspections/$id/photos';
}
