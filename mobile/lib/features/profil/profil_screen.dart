import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../auth/auth_provider.dart';

class ProfilScreen extends StatefulWidget {
  const ProfilScreen({super.key});

  @override
  State<ProfilScreen> createState() => _ProfilScreenState();
}

class _ProfilScreenState extends State<ProfilScreen> {
  bool _changingPassword = false;
  final _oldPassCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();
  bool _obscureOld = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _saving = false;
  String? _pwError;
  String? _pwSuccess;

  @override
  void dispose() {
    _oldPassCtrl.dispose();
    _newPassCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    setState(() { _pwError = null; _pwSuccess = null; });
    if (_newPassCtrl.text != _confirmPassCtrl.text) {
      setState(() => _pwError = 'Konfirmasi password tidak cocok');
      return;
    }
    if (_newPassCtrl.text.length < 6) {
      setState(() => _pwError = 'Password minimal 6 karakter');
      return;
    }
    setState(() => _saving = true);
    try {
      final auth = context.read<AuthProvider>();
      final userId = auth.user?['id'];
      await ApiClient().put('${ApiEndpoints.users}/$userId', {
        'currentPassword': _oldPassCtrl.text,
        'password': _newPassCtrl.text,
      });
      _oldPassCtrl.clear();
      _newPassCtrl.clear();
      _confirmPassCtrl.clear();
      setState(() { _pwSuccess = 'Password berhasil diubah'; _changingPassword = false; });
    } catch (e) {
      setState(() => _pwError = e.toString());
    } finally {
      setState(() => _saving = false);
    }
  }

  Future<void> _confirmLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Keluar', style: TextStyle(color: Colors.white)),
        content: const Text('Yakin ingin keluar dari aplikasi?',
            style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
    if (confirm == true && mounted) {
      await context.read<AuthProvider>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final isAdmin = auth.isAdmin;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Profil'),
        backgroundColor: AppColors.surface,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Column(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        ((user?['name'] as String?) ?? 'U').substring(0, 1).toUpperCase(),
                        style: const TextStyle(
                            color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(user?['name'] ?? '',
                      style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
                    decoration: BoxDecoration(
                      color: isAdmin
                          ? AppColors.accent.withValues(alpha: 0.15)
                          : AppColors.info.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      isAdmin ? 'Administrator' : 'Inspektur',
                      style: TextStyle(
                          color: isAdmin ? AppColors.accent : AppColors.info,
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            _SectionCard(title: 'Informasi Akun', children: [
              _InfoRow(label: 'Username', value: user?['username'] ?? '-'),
              _InfoRow(label: 'Nama Lengkap', value: user?['name'] ?? '-'),
              _InfoRow(label: 'Email', value: user?['email'] ?? '-'),
              _InfoRow(label: 'Role', value: isAdmin ? 'Administrator' : 'Inspektur'),
            ]),
            const SizedBox(height: 16),
            _SectionCard(title: 'Keamanan', children: [
              if (!_changingPassword) ...[
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.lock_outline, color: AppColors.textSecondary),
                  title: Text('Ubah Password',
                      style: TextStyle(color: AppColors.textPrimary)),
                  trailing: Icon(Icons.chevron_right, color: AppColors.textMuted),
                  onTap: () => setState(() {
                    _changingPassword = true;
                    _pwError = null;
                    _pwSuccess = null;
                  }),
                ),
              ] else ...[
                if (_pwError != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                    ),
                    child: Text(_pwError!,
                        style: TextStyle(color: AppColors.danger, fontSize: 13)),
                  ),
                _PasswordField(
                  controller: _oldPassCtrl,
                  label: 'Password Lama',
                  obscure: _obscureOld,
                  onToggle: () => setState(() => _obscureOld = !_obscureOld),
                ),
                const SizedBox(height: 10),
                _PasswordField(
                  controller: _newPassCtrl,
                  label: 'Password Baru',
                  obscure: _obscureNew,
                  onToggle: () => setState(() => _obscureNew = !_obscureNew),
                ),
                const SizedBox(height: 10),
                _PasswordField(
                  controller: _confirmPassCtrl,
                  label: 'Konfirmasi Password Baru',
                  obscure: _obscureConfirm,
                  onToggle: () => setState(() => _obscureConfirm = !_obscureConfirm),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => setState(() => _changingPassword = false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textSecondary,
                          side: BorderSide(color: AppColors.border),
                        ),
                        child: const Text('Batal'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _saving ? null : _changePassword,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                        ),
                        child: _saving
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Simpan'),
                      ),
                    ),
                  ],
                ),
              ],
              if (_pwSuccess != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(_pwSuccess!,
                      style: TextStyle(color: AppColors.success, fontSize: 13)),
                ),
            ]),
            const SizedBox(height: 16),
            _SectionCard(title: 'Tentang Aplikasi', children: [
              _InfoRow(label: 'Versi', value: '1.0.0'),
              _InfoRow(label: 'Platform', value: 'InspeksiPro Mobile'),
            ]),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _confirmLogout,
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Keluar'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.danger.withValues(alpha: 0.15),
                  foregroundColor: AppColors.danger,
                  side: BorderSide(color: AppColors.danger.withValues(alpha: 0.4)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _SectionCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5)),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      );
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 130,
              child: Text(label,
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ),
            Expanded(
              child: Text(value,
                  style: TextStyle(color: AppColors.textPrimary, fontSize: 13)),
            ),
          ],
        ),
      );
}

class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool obscure;
  final VoidCallback onToggle;
  const _PasswordField({
    required this.controller,
    required this.label,
    required this.obscure,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        obscureText: obscure,
        style: TextStyle(color: AppColors.textPrimary),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: TextStyle(color: AppColors.textSecondary),
          filled: true,
          fillColor: AppColors.inputBg,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: AppColors.primary),
          ),
          suffixIcon: IconButton(
            icon: Icon(
              obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
              color: AppColors.textMuted,
              size: 18,
            ),
            onPressed: onToggle,
          ),
        ),
      );
}
