import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';
import '../../core/utils/geofence_helper.dart';
import '../../shared/widgets/status_badge.dart';

class InspectionFormScreen extends StatefulWidget {
  final String inspectionId;
  const InspectionFormScreen({super.key, required this.inspectionId});

  @override
  State<InspectionFormScreen> createState() =>
      _InspectionFormScreenState();
}

class _InspectionFormScreenState extends State<InspectionFormScreen> {
  int _step = 0; // 0=GPS, 1=Checklist, 2=Foto, 3=Temuan, 4=Submit

  Map<String, dynamic>? _inspection;
  List<Map<String, dynamic>> _checklist = [];
  List<Map<String, dynamic>> _findings = [];
  List<File> _photos = [];
  List<Map<String, dynamic>> _namedPhotos = []; // [{label: str, file: File?}]
  String _overallStatus = '';
  String _catatan = '';

  bool _loading = true;
  bool _submitting = false;

  static const _namedPhotoSlots = {
    'p3k': ['Foto tampak depan kotak P3K', 'Foto seluruh isi kotak', 'Foto item yang mendekati kadaluarsa', 'Foto penempatan di lokasi kerja'],
    'apar': ['Tampak Depan APAR', 'Pressure gauge', 'Label kadaluarsa', 'Area Pemasangan'],
  };
  static const _overallStatusOpts = {
    'p3k': ['Lengkap & Layak', 'Kurang (Perlu Penambahan)', 'Tidak Layak (Perlu Penggantian)'],
    'apar': ['Layak Pakai', 'Perlu Perbaikan', 'Perlu Penggantian'],
  };
  static const _comingSoonTypes = ['apd', 'fire_alarm', 'hydrant'];

  // GPS
  double? _userLat, _userLng;
  double? _distanceM;
  bool _withinFence = false;
  String _gpsStatus = 'checking'; // checking | ok | warning | error

  static const _stepLabels = ['GPS', 'Checklist', 'Foto', 'Temuan', 'Submit'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final inspRes = await ApiClient()
          .get(ApiEndpoints.inspectionById(widget.inspectionId));
      final inspection = inspRes['data'] as Map<String, dynamic>;
      final inspType = (inspection['type'] as String?) ?? 'tps_lb3';
      final tmplRes = await ApiClient()
          .get(ApiEndpoints.checklistTemplatesByType(inspType));
      final templates =
          (tmplRes['data']['templates'] as List?) ?? [];
      if (mounted) {
        final isInProgress = inspection['status'] == 'berlangsung';
        final inspType = (inspection['type'] as String?) ?? 'tps_lb3';
        final slots = _namedPhotoSlots[inspType] ?? [];
        final statusOpts = _overallStatusOpts[inspType] ?? [];
        setState(() {
          _inspection = inspection;
          _checklist = templates
              .map<Map<String, dynamic>>((t) => {
                    'templateId': t['id'],
                    'category': t['category'],
                    'description': t['description'],
                    'answerOptions': t['answerOptions'] ?? '[]',
                    'requiresPhoto': t['requiresPhoto'] ?? false,
                    'photoLabel': t['photoLabel'] ?? '',
                    'status': '',
                    'comment': '',
                  })
              .toList();
          _namedPhotos = slots
              .map<Map<String, dynamic>>((label) => {'label': label, 'file': null})
              .toList();
          _overallStatus = statusOpts.isNotEmpty ? statusOpts[0] : '';
          _loading = false;
          if (isInProgress) _step = 1;
        });
        if (!isInProgress) _checkGPS();
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _checkGPS() async {
    setState(() => _gpsStatus = 'checking');
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        if (mounted) setState(() => _gpsStatus = 'error');
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high);
      final wh = _inspection!['warehouse'];
      final dist = GeofenceHelper.calcDistance(
        pos.latitude,
        pos.longitude,
        (wh['latitude'] as num).toDouble(),
        (wh['longitude'] as num).toDouble(),
      );
      final within =
          dist <= (wh['geoFenceRadius'] as num).toDouble();
      if (mounted) {
        setState(() {
          _userLat = pos.latitude;
          _userLng = pos.longitude;
          _distanceM = dist;
          _withinFence = within;
          _gpsStatus = within ? 'ok' : 'warning';
        });
      }
    } catch (_) {
      if (mounted) setState(() => _gpsStatus = 'error');
    }
  }

  Future<void> _startInspection() async {
    try {
      final body = <String, dynamic>{};
      if (_userLat != null) {
        body['gpsLat'] = _userLat;
        body['gpsLng'] = _userLng;
      }
      await ApiClient()
          .post(ApiEndpoints.startInspection(widget.inspectionId), body);
      if (mounted) setState(() => _step = 1);
    } catch (e) {
      _snack(e.toString(), isError: true);
    }
  }

  Future<void> _submitInspection() async {
    setState(() => _submitting = true);
    try {
      // Save checklist
      await ApiClient().put(
        ApiEndpoints.checklistResults(widget.inspectionId),
        {
          'results': _checklist
              .map((c) => {
                    'templateId': c['templateId'],
                    'status': (c['status'] as String).isEmpty
                        ? 'na'
                        : c['status'],
                    'comment': c['comment'],
                  })
              .toList(),
        },
      );

      // Save findings
      for (final f in _findings) {
        await ApiClient().post(
            ApiEndpoints.inspectionFindings(widget.inspectionId), f);
      }

      // Upload named photos with labels
      for (final np in _namedPhotos) {
        final file = np['file'] as File?;
        if (file != null) {
          await ApiClient().postMultipart(
            ApiEndpoints.inspectionPhotos(widget.inspectionId),
            file,
            fields: {'label': np['label'] as String},
          );
        }
      }

      // Upload extra photos
      for (final photo in _photos) {
        await ApiClient().postMultipart(
          ApiEndpoints.inspectionPhotos(widget.inspectionId),
          photo,
        );
      }

      // Complete
      final completeBody = <String, dynamic>{};
      if (_catatan.isNotEmpty) completeBody['notes'] = _catatan;
      if (_overallStatus.isNotEmpty) completeBody['overallStatus'] = _overallStatus;
      await ApiClient().post(
          ApiEndpoints.completeInspection(widget.inspectionId), completeBody);

      if (mounted) {
        _snack('✅ Inspeksi berhasil diselesaikan!');
        context.go('/inspeksi');
      }
    } catch (e) {
      _snack(e.toString(), isError: true);
    }
    if (mounted) setState(() => _submitting = false);
  }

  List<Map<String, dynamic>> _parseOpts(String json) {
    try {
      final list = (jsonDecode(json) as List);
      return list.cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  void _snack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? AppColors.danger : AppColors.success,
    ));
  }

  Future<void> _pickPhoto() async {
    final src = await showDialog<ImageSource>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Pilih Foto',
            style: TextStyle(color: AppColors.textPrimary)),
        actions: [
          TextButton(
            onPressed: () =>
                Navigator.pop(dialogCtx, ImageSource.camera),
            child: const Text('Kamera'),
          ),
          TextButton(
            onPressed: () =>
                Navigator.pop(dialogCtx, ImageSource.gallery),
            child: const Text('Galeri'),
          ),
        ],
      ),
    );
    if (src == null || !mounted) return;
    try {
      final picked = await ImagePicker()
          .pickImage(source: src, imageQuality: 75);
      if (picked != null && mounted) {
        setState(() => _photos.add(File(picked.path)));
      }
    } catch (e) {
      _snack('Gagal membuka ${src == ImageSource.camera ? 'kamera' : 'galeri'}', isError: true);
    }
  }

  // ─── BUILD ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
          body: Center(child: CircularProgressIndicator()));
    }
    if (_inspection == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Inspeksi')),
        body: const Center(
            child: Text('Inspeksi tidak ditemukan',
                style: TextStyle(color: Colors.grey))),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _inspection!['warehouse']['name'] ?? '',
          overflow: TextOverflow.ellipsis,
        ),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.go('/inspeksi'),
        ),
      ),
      body: Column(
        children: [
          _buildStepBar(),
          Expanded(child: _buildStepContent()),
        ],
      ),
    );
  }

  // Step indicator bar
  Widget _buildStepBar() {
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: AppColors.surface,
      child: Row(
        children: List.generate(_stepLabels.length * 2 - 1, (i) {
          if (i.isOdd) {
            return Expanded(
              child: Container(
                height: 2,
                color: i ~/ 2 < _step
                    ? AppColors.success
                    : AppColors.border,
              ),
            );
          }
          final si = i ~/ 2;
          final done = si < _step;
          final active = si == _step;
          return Column(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: done
                      ? AppColors.success
                      : active
                          ? AppColors.primary
                          : AppColors.border,
                ),
                child: Center(
                  child: done
                      ? const Icon(Icons.check,
                          size: 14, color: Colors.white)
                      : Text('${si + 1}',
                          style: TextStyle(
                            color: active
                                ? Colors.white
                                : AppColors.textSecondary,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          )),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                _stepLabels[si],
                style: TextStyle(
                  fontSize: 9,
                  color: active
                      ? AppColors.primary
                      : AppColors.textSecondary,
                  fontWeight: active
                      ? FontWeight.w600
                      : FontWeight.normal,
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_step) {
      case 0:
        return _buildGpsStep();
      case 1:
        return _buildChecklistStep();
      case 2:
        return _buildPhotosStep();
      case 3:
        return _buildFindingsStep();
      case 4:
        return _buildSubmitStep();
      default:
        return const SizedBox.shrink();
    }
  }

  // ─── STEP 0: GPS ──────────────────────────────────────────────────────────

  Widget _buildGpsStep() {
    final wh = _inspection!['warehouse'];
    Color iconColor = AppColors.textSecondary;
    IconData icon = Icons.gps_fixed;
    String title = 'Mengecek GPS...';
    String subtitle =
        'Memastikan Anda berada di area gudang';

    switch (_gpsStatus) {
      case 'ok':
        iconColor = AppColors.success;
        icon = Icons.check_circle_outline;
        title =
            '${_distanceM?.toStringAsFixed(0) ?? '?'}m dari gudang';
        subtitle =
            'Dalam radius ${wh['geoFenceRadius']}m ✅';
        break;
      case 'warning':
        iconColor = AppColors.warning;
        icon = Icons.warning_amber_outlined;
        title =
            '${_distanceM?.toStringAsFixed(0) ?? '?'}m dari gudang';
        subtitle =
            'Di luar radius ${wh['geoFenceRadius']}m — tetap lanjut';
        break;
      case 'error':
        iconColor = AppColors.danger;
        icon = Icons.gps_off;
        title = 'GPS Tidak Tersedia';
        subtitle = 'Melanjutkan tanpa verifikasi GPS';
        break;
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 20),
          AnimatedContainer(
            duration: const Duration(milliseconds: 400),
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: iconColor.withOpacity(0.1),
              border: Border.all(color: iconColor, width: 2),
            ),
            child: Icon(icon, color: iconColor, size: 48),
          ),
          const SizedBox(height: 24),
          Text(
            title,
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: TextStyle(
                color: AppColors.textSecondary, fontSize: 14),
            textAlign: TextAlign.center,
          ),
          if (_userLat != null) ...[
            const SizedBox(height: 8),
            Text(
              '${_userLat!.toStringAsFixed(5)}, ${_userLng!.toStringAsFixed(5)}',
              style: TextStyle(color: AppColors.textMuted, fontSize: 11),
            ),
            const SizedBox(height: 20),
            _buildGpsMap(),
          ],
          const SizedBox(height: 32),
          if (_gpsStatus == 'checking')
            const CircularProgressIndicator()
          else ...[
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _startInspection,
                icon: const Icon(Icons.play_arrow_rounded),
                label: const Text('Mulai Inspeksi'),
                style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 13)),
              ),
            ),
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: _checkGPS,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Cek Ulang GPS'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildGpsMap() {
    final wh = _inspection!['warehouse'];
    final whLat = (wh['latitude'] as num).toDouble();
    final whLng = (wh['longitude'] as num).toDouble();
    final radius = (wh['geoFenceRadius'] as num).toDouble();
    final center = LatLng(
      (_userLat! + whLat) / 2,
      (_userLng! + whLng) / 2,
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: 220,
        child: FlutterMap(
          options: MapOptions(
            initialCenter: center,
            initialZoom: 15,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
            ),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.example.inspeksipro',
            ),
            // Geofence circle (dashed via custom painter not available, use CircleLayer)
            CircleLayer(circles: [
              CircleMarker(
                point: LatLng(whLat, whLng),
                radius: radius,
                useRadiusInMeter: true,
                color: const Color(0x146366f1),
                borderColor: const Color(0xFF6366f1),
                borderStrokeWidth: 2,
              ),
            ]),
            // Markers
            CircleLayer(circles: [
              // Gudang — indigo
              CircleMarker(
                point: LatLng(whLat, whLng),
                radius: 9,
                color: const Color(0xFF6366f1),
                borderColor: Colors.white,
                borderStrokeWidth: 2,
              ),
              // User — green/warning
              CircleMarker(
                point: LatLng(_userLat!, _userLng!),
                radius: 9,
                color: _withinFence
                    ? const Color(0xFF10b981)
                    : const Color(0xFFf59e0b),
                borderColor: Colors.white,
                borderStrokeWidth: 2,
              ),
            ]),
          ],
        ),
      ),
    );
  }

  // ─── STEP 1: CHECKLIST ────────────────────────────────────────────────────

  Widget _buildChecklistStep() {
    final inspType = (_inspection?['type'] as String?) ?? '';
    final isComingSoon = _comingSoonTypes.contains(inspType);
    final categories =
        _checklist.map((c) => c['category'] as String).toSet().toList();

    return Column(
      children: [
        Expanded(
          child: isComingSoon
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('🚧', style: TextStyle(fontSize: 64)),
                      const SizedBox(height: 16),
                      Text('Segera Hadir',
                          style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 22,
                              fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      Text('Form inspeksi ini sedang dalam pengembangan.',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                          textAlign: TextAlign.center),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: categories.length,
                  itemBuilder: (_, ci) {
                    final cat = categories[ci];
                    final items = _checklist
                        .where((c) => c['category'] == cat)
                        .toList();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Text(
                            cat,
                            style: TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        ...items.map((item) {
                          final idx = _checklist.indexOf(item);
                          return _ChecklistItem(
                            item: item,
                            onStatusChanged: (s) => setState(
                                () => _checklist[idx]['status'] = s),
                            onCommentChanged: (v) =>
                                _checklist[idx]['comment'] = v,
                          );
                        }),
                        const SizedBox(height: 8),
                      ],
                    );
                  },
                ),
        ),
        _buildNavRow(
          onPrev: () => setState(() => _step = 0),
          onNext: () => setState(() => _step = 2),
        ),
      ],
    );
  }

  // ─── STEP 2: PHOTOS ───────────────────────────────────────────────────────

  Future<void> _pickNamedPhoto(int idx) async {
    final src = await showDialog<ImageSource>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Pilih Foto', style: TextStyle(color: AppColors.textPrimary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogCtx, ImageSource.camera), child: const Text('Kamera')),
          TextButton(onPressed: () => Navigator.pop(dialogCtx, ImageSource.gallery), child: const Text('Galeri')),
        ],
      ),
    );
    if (src == null || !mounted) return;
    try {
      final picked = await ImagePicker().pickImage(source: src, imageQuality: 75);
      if (picked != null && mounted) {
        setState(() => _namedPhotos[idx] = {
          'label': _namedPhotos[idx]['label'],
          'file': File(picked.path),
        });
      }
    } catch (_) {}
  }

  Widget _buildPhotosStep() {
    final hasNamed = _namedPhotos.isNotEmpty;
    final statusOpts = _overallStatusOpts[(_inspection?['type'] as String?) ?? ''] ?? [];

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Named photo slots
                if (hasNamed) ...[
                  Text('📸 Foto Wajib',
                      style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15)),
                  const SizedBox(height: 12),
                  ..._namedPhotos.asMap().entries.map((e) {
                    final idx = e.key;
                    final np = e.value;
                    final file = np['file'] as File?;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: file != null ? AppColors.success : AppColors.border),
                      ),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: file != null
                                ? Image.file(file, width: 60, height: 60, fit: BoxFit.cover)
                                : Container(
                                    width: 60, height: 60,
                                    decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8)),
                                    child: Icon(Icons.camera_alt_outlined, color: AppColors.textMuted, size: 28),
                                  ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(np['label'] as String,
                                    style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                    maxLines: 2),
                                if (file != null)
                                  Text('✓ Terambil', style: TextStyle(color: AppColors.success, fontSize: 11)),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () => _pickNamedPhoto(idx),
                            child: Text(file != null ? 'Ganti' : 'Ambil',
                                style: TextStyle(color: AppColors.primary, fontSize: 12)),
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 16),
                ],

                // Overall status
                if (statusOpts.isNotEmpty) ...[
                  Text('Status Keseluruhan',
                      style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: statusOpts.map((opt) => GestureDetector(
                      onTap: () => setState(() => _overallStatus = opt),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: _overallStatus == opt ? AppColors.primary.withOpacity(0.15) : AppColors.surface,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: _overallStatus == opt ? AppColors.primary : AppColors.border),
                        ),
                        child: Text(opt, style: TextStyle(
                          color: _overallStatus == opt ? AppColors.primary : AppColors.textSecondary,
                          fontSize: 12, fontWeight: FontWeight.w500,
                        )),
                      ),
                    )).toList(),
                  ),
                  const SizedBox(height: 16),
                ],

                // Catatan
                Text('Catatan', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 8),
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Catatan tambahan (opsional)...',
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                  ),
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  maxLines: 3,
                  onChanged: (v) => _catatan = v,
                ),
                const SizedBox(height: 16),

                // Extra photos
                Text('📷 Foto Tambahan',
                    style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 8),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3, crossAxisSpacing: 8, mainAxisSpacing: 8,
                  ),
                  itemCount: _photos.length + 1,
                  itemBuilder: (_, i) {
                    if (i == _photos.length) {
                      return GestureDetector(
                        onTap: _pickPhoto,
                        child: Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.border, width: 2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_a_photo_outlined, color: AppColors.textSecondary, size: 26),
                              const SizedBox(height: 4),
                              Text('Tambah', style: TextStyle(color: AppColors.textSecondary, fontSize: 10)),
                            ],
                          ),
                        ),
                      );
                    }
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.file(_photos[i], fit: BoxFit.cover, width: double.infinity, height: double.infinity),
                        ),
                        Positioned(
                          top: 4, right: 4,
                          child: GestureDetector(
                            onTap: () => setState(() => _photos.removeAt(i)),
                            child: Container(
                              width: 22, height: 22,
                              decoration: BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
                              child: const Icon(Icons.close, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        ),
        _buildNavRow(
          onPrev: () => setState(() => _step = 1),
          onNext: () => setState(() => _step = 3),
        ),
      ],
    );
  }

  // ─── STEP 3: FINDINGS ─────────────────────────────────────────────────────

  Widget _buildFindingsStep() {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('⚠️ Temuan & Rekomendasi',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    )),
                const SizedBox(height: 16),
                ..._findings.asMap().entries.map((e) =>
                    _FindingCard(
                      finding: e.value,
                      onChanged: (key, val) => setState(
                          () => _findings[e.key][key] = val),
                      onDelete: () =>
                          setState(() => _findings.removeAt(e.key)),
                    )),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => setState(() => _findings.add({
                          'severity': 'ringan',
                          'description': '',
                          'recommendation': '',
                        })),
                    icon: const Icon(Icons.add),
                    label: const Text('Tambah Temuan'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: BorderSide(color: AppColors.primary),
                      padding:
                          const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        _buildNavRow(
          onPrev: () => setState(() => _step = 2),
          onNext: () => setState(() => _step = 4),
        ),
      ],
    );
  }

  // ─── STEP 4: SUBMIT ───────────────────────────────────────────────────────

  Widget _buildSubmitStep() {
    // Score based on answerOptions weights
    double totalMax = 0;
    double totalScore = 0;
    for (final c in _checklist) {
      final opts = _parseOpts(c['answerOptions'] as String? ?? '[]');
      if (opts.isEmpty) continue;
      final maxScore = opts.map((o) => (o['score'] as num).toDouble()).reduce((a, b) => a > b ? a : b);
      totalMax += maxScore;
      final sel = opts.firstWhere((o) => o['label'] == c['status'], orElse: () => {'score': 0});
      totalScore += (sel['score'] as num).toDouble();
    }
    final score = totalMax > 0 ? (totalScore / totalMax * 100).round() : 0;
    final filled = _checklist.where((c) => (c['status'] as String).isNotEmpty).length;
    final scoreColor = score >= 80
        ? AppColors.success
        : score >= 60
            ? AppColors.warning
            : AppColors.danger;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Score ring
                SizedBox(
                  width: 140,
                  height: 140,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircularProgressIndicator(
                        value: score / 100,
                        strokeWidth: 10,
                        backgroundColor: AppColors.border,
                        color: scoreColor,
                        strokeCap: StrokeCap.round,
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$score%',
                            style: TextStyle(
                              color: scoreColor,
                              fontSize: 30,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text('Skor',
                              style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: 2.2,
                  children: [
                    _SummaryTile('Checklist',
                        '$filled/${_checklist.length}', AppColors.info),
                    _SummaryTile('Skor', '$score%',
                        AppColors.success),
                    _SummaryTile('Temuan',
                        '${_findings.length} item', AppColors.warning),
                    _SummaryTile('Foto Wajib',
                        '${_namedPhotos.where((p) => p['file'] != null).length}/${_namedPhotos.length}', AppColors.primary),
                  ],
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _step = 3),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textSecondary,
                    side: BorderSide(color: AppColors.border),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('← Kembali'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton.icon(
                  onPressed:
                      _submitting ? null : _submitInspection,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  icon: _submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.check_circle_outline,
                          size: 18),
                  label: Text(_submitting
                      ? 'Menyimpan...'
                      : 'Submit Laporan'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── NAV ROW ──────────────────────────────────────────────────────────────

  Widget _buildNavRow(
      {required VoidCallback onPrev, required VoidCallback onNext}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: onPrev,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textSecondary,
                side: BorderSide(color: AppColors.border),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: const Text('← Kembali'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: onNext,
              style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12)),
              child: const Text('Lanjut →'),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── CHECKLIST ITEM WIDGET ────────────────────────────────────────────────────

class _ChecklistItem extends StatefulWidget {
  final Map<String, dynamic> item;
  final ValueChanged<String> onStatusChanged;
  final ValueChanged<String> onCommentChanged;

  const _ChecklistItem({
    required this.item,
    required this.onStatusChanged,
    required this.onCommentChanged,
  });

  @override
  State<_ChecklistItem> createState() => _ChecklistItemState();
}

class _ChecklistItemState extends State<_ChecklistItem> {
  bool _showComment = false;

  List<Map<String, dynamic>> get _opts {
    try {
      final raw = widget.item['answerOptions'];
      if (raw == null || raw == '[]') return [];
      return (jsonDecode(raw as String) as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  @override
  Widget build(BuildContext context) {
    final opts = _opts;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.item['description'],
                style: TextStyle(
                    color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: opts.map((opt) {
                final label = opt['label'] as String;
                final score = (opt['score'] as num).toDouble();
                final isSelected = widget.item['status'] == label;
                final activeColor = score > 0 ? AppColors.success : AppColors.danger;
                return GestureDetector(
                  onTap: () => widget.onStatusChanged(label),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? activeColor.withValues(alpha: 0.2)
                          : AppColors.background,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected ? activeColor : AppColors.border,
                      ),
                    ),
                    child: Text(
                      label,
                      style: TextStyle(
                        color: isSelected ? activeColor : AppColors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            if (_showComment) ...[
              const SizedBox(height: 8),
              TextField(
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Komentar...',
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 8),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: AppColors.border),
                  ),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.close, size: 16),
                    onPressed: () => setState(() => _showComment = false),
                    padding: EdgeInsets.zero,
                  ),
                ),
                style: TextStyle(
                    color: AppColors.textSecondary, fontSize: 12),
                onChanged: widget.onCommentChanged,
              ),
            ] else ...[
              const SizedBox(height: 4),
              GestureDetector(
                onTap: () => setState(() => _showComment = true),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Text(
                    widget.item['comment'] != null && (widget.item['comment'] as String).isNotEmpty
                        ? '💬 ${widget.item['comment']}'
                        : '+ Tambah komentar',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─── FINDING CARD WIDGET ──────────────────────────────────────────────────────

class _FindingCard extends StatelessWidget {
  final Map<String, dynamic> finding;
  final void Function(String key, dynamic value) onChanged;
  final VoidCallback onDelete;

  const _FindingCard({
    required this.finding,
    required this.onChanged,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                DropdownButton<String>(
                  value: finding['severity'] as String,
                  dropdownColor: AppColors.surface,
                  underline: const SizedBox.shrink(),
                  items: ['ringan', 'sedang', 'kritis']
                      .map((s) => DropdownMenuItem(
                            value: s,
                            child: StatusBadge(status: s),
                          ))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) onChanged('severity', v);
                  },
                ),
                IconButton(
                  icon: Icon(Icons.delete_outline,
                      color: AppColors.danger, size: 20),
                  onPressed: onDelete,
                  padding: EdgeInsets.zero,
                ),
              ],
            ),
            const SizedBox(height: 6),
            TextField(
              decoration: InputDecoration(
                hintText: 'Deskripsi temuan...',
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 8),
              ),
              style: TextStyle(
                  color: AppColors.textPrimary, fontSize: 13),
              maxLines: 2,
              onChanged: (v) => onChanged('description', v),
            ),
            const SizedBox(height: 6),
            TextField(
              decoration: InputDecoration(
                hintText: 'Rekomendasi perbaikan...',
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 8),
              ),
              style: TextStyle(
                  color: AppColors.textSecondary, fontSize: 13),
              maxLines: 2,
              onChanged: (v) => onChanged('recommendation', v),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── SUMMARY TILE ─────────────────────────────────────────────────────────────

class _SummaryTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _SummaryTile(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(value,
              style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w800,
                  fontSize: 15)),
          Text(label,
              style: TextStyle(
                  color: AppColors.textSecondary, fontSize: 11)),
        ],
      ),
    );
  }
}
