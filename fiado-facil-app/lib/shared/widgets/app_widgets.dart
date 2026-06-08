import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

// ── StatusBadge ──────────────────────────────────────────────────────────────

class StatusBadge extends StatelessWidget {
  final String label;
  final Color bg;
  final Color fg;

  const StatusBadge({super.key, required this.label, required this.bg, required this.fg});

  factory StatusBadge.fromStatus(String status) {
    final map = {
      'ativo':        (const Color(0xFFDCFCE7), const Color(0xFF166534)),
      'inadimplente': (const Color(0xFFFEF3C7), const Color(0xFF92400E)),
      'bloqueado':    (const Color(0xFFFEE2E2), const Color(0xFF991B1B)),
      'inativo':      (const Color(0xFFF3F4F6), const Color(0xFF374151)),
    };
    final c = map[status] ?? (const Color(0xFFF3F4F6), const Color(0xFF374151));
    return StatusBadge(label: _statusLabel[status] ?? status, bg: c.$1, fg: c.$2);
  }

  factory StatusBadge.fromRisco(String risco) {
    final map = {
      'baixo': (const Color(0xFFDCFCE7), const Color(0xFF166534)),
      'medio': (const Color(0xFFFEF3C7), const Color(0xFF92400E)),
      'alto':  (const Color(0xFFFEE2E2), const Color(0xFF991B1B)),
    };
    final c = map[risco] ?? (const Color(0xFFF3F4F6), const Color(0xFF374151));
    final label = risco == 'baixo' ? 'Baixo' : risco == 'medio' ? 'Médio' : 'Alto';
    return StatusBadge(label: 'Risco $label', bg: c.$1, fg: c.$2);
  }

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
    child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
  );
}

const _statusLabel = {
  'ativo': 'Ativo',
  'inadimplente': 'Inadimplente',
  'bloqueado': 'Bloqueado',
  'inativo': 'Inativo',
};

// ── SectionTitle ──────────────────────────────────────────────────────────────

class SectionTitle extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const SectionTitle(this.text, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(text, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
      if (trailing != null) trailing!,
    ],
  );
}

// ── AppCard ──────────────────────────────────────────────────────────────────

class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  const AppCard({super.key, required this.child, this.padding, this.onTap});

  @override
  Widget build(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(padding: padding ?? const EdgeInsets.all(16), child: child),
    ),
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────

class StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final String? subtitle;

  const StatCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        const SizedBox(height: 12),
        Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppTheme.textPrimary)),
        const SizedBox(height: 2),
        Text(title, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(subtitle!, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
        ],
      ],
    ),
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? action;
  const EmptyState({super.key, required this.icon, required this.title, this.subtitle, this.action});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(subtitle!, style: const TextStyle(color: AppTheme.textSecondary), textAlign: TextAlign.center),
          ],
          if (action != null) ...[const SizedBox(height: 20), action!],
        ],
      ),
    ),
  );
}

// ── LoadingOverlay ────────────────────────────────────────────────────────────

class LoadingOverlay extends StatelessWidget {
  final bool isLoading;
  final Widget child;
  const LoadingOverlay({super.key, required this.isLoading, required this.child});

  @override
  Widget build(BuildContext context) => Stack(
    children: [
      child,
      if (isLoading)
        Container(
          color: Colors.black26,
          child: const Center(child: CircularProgressIndicator()),
        ),
    ],
  );
}

// ── LimitBar ─────────────────────────────────────────────────────────────────

class LimitBar extends StatelessWidget {
  final double percent;
  const LimitBar({super.key, required this.percent});

  @override
  Widget build(BuildContext context) {
    final color = percent > 0.8 ? AppTheme.danger : percent > 0.5 ? AppTheme.warning : AppTheme.success;
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: LinearProgressIndicator(
        value: percent.clamp(0, 1),
        backgroundColor: AppTheme.border,
        valueColor: AlwaysStoppedAnimation<Color>(color),
        minHeight: 6,
      ),
    );
  }
}
