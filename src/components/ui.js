import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { colors, radius, spacing, typeScale, weights } from '../theme';
import { initialsFromName } from '../utils/format';

const buttonVariants = {
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    textColor: '#FFFFFF'
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    textColor: colors.text
  },
  accent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    textColor: '#FFFFFF'
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    textColor: '#FFFFFF'
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    textColor: colors.text
  }
};

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  style
}) {
  const palette = buttonVariants[variant] || buttonVariants.primary;
  const paddingVertical = size === 'sm' ? 8 : 12;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          paddingVertical,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1
        },
        style
      ]}
    >
      {icon ? <Text style={[styles.buttonIcon, { color: palette.textColor }]}>{icon}</Text> : null}
      <Text style={[styles.buttonLabel, { color: palette.textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function Input({
  label,
  helper,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  editable = true,
  secureTextEntry = false,
  right,
  style,
  inputStyle,
  numberOfLines
}) {
  return (
    <View style={style}>
      {!!label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          multiline={multiline}
          keyboardType={keyboardType}
          editable={editable}
          secureTextEntry={secureTextEntry}
          numberOfLines={numberOfLines}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            right ? { paddingRight: 56 } : null,
            inputStyle
          ]}
        />
        {right ? <View style={styles.inputRight}>{right}</View> : null}
      </View>
      {!!helper && <Text style={styles.inputHelper}>{helper}</Text>}
    </View>
  );
}

export function Badge({ label, tone = 'neutral', style }) {
  const palette = badgeTones[tone] || badgeTones.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: palette.background, borderColor: palette.border }, style]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function Chip({ label, active = false, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
          opacity: pressed ? 0.9 : 1
        },
        style
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function StatCard({ label, value, hint, icon, tone = 'primary' }) {
  const palette = statTones[tone] || statTones.primary;
  return (
    <Card style={[styles.statCard, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <View style={styles.statTopRow}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={[styles.statHint, { color: palette.text }]}>{hint}</Text>
      </View>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.text }]}>{label}</Text>
    </Card>
  );
}

export function AvatarCircle({ name, size = 56, style }) {
  const initials = useMemo(() => initialsFromName(name), [name]);

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style
      ]}
    >
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

export function ToggleField({ label, value, onValueChange, helper }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {!!helper && <Text style={styles.toggleHelper}>{helper}</Text>}
      </View>
      <Switch
        value={Boolean(value)}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export function EmptyState({ title, description, actionLabel, onAction, icon = '🌾' }) {
  return (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {actionLabel ? <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.md }} /> : null}
    </Card>
  );
}

export function ProductMedia({ uri, title, category, style }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const fallbackLabel = category || initialsFromName(title || 'Product');

  if (!uri || loadFailed) {
    return (
      <View style={[styles.mediaFallback, style]}>
        <Text style={styles.mediaFallbackLabel}>{fallbackLabel}</Text>
        <Text style={styles.mediaFallbackTitle}>{title}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.mediaImage, style]}
      onError={() => setLoadFailed(true)}
      resizeMode="cover"
    />
  );
}

export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

export function FieldRow({ children, style }) {
  return <View style={[styles.fieldRow, style]}>{children}</View>;
}

export function Callout({ title, description, tone = 'neutral' }) {
  const palette = badgeTones[tone] || badgeTones.neutral;
  return (
    <View style={[styles.callout, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <Text style={[styles.calloutTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.calloutDescription, { color: palette.text }]}>{description}</Text>
    </View>
  );
}

export function SearchField(props) {
  return <Input {...props} inputStyle={styles.searchInput} />;
}

const badgeTones = {
  neutral: {
    background: colors.surfaceSoft,
    border: colors.borderSoft,
    text: colors.text
  },
  primary: {
    background: '#E4F2E4',
    border: '#C4E0C4',
    text: colors.primaryDark
  },
  success: {
    background: '#E4F7EF',
    border: '#C8EBD7',
    text: colors.success
  },
  warning: {
    background: colors.accentSoft,
    border: '#F0D69A',
    text: colors.warning
  },
  danger: {
    background: '#F9E4E4',
    border: '#F0C1C1',
    text: colors.danger
  },
  info: {
    background: '#E6F0FD',
    border: '#C7D9F6',
    text: colors.info
  }
};

const statTones = {
  primary: {
    background: '#EAF5EA',
    border: '#D5E8D6',
    text: colors.primaryDark
  },
  accent: {
    background: '#FFF3D8',
    border: '#F0D6A5',
    text: '#8C5A00'
  },
  info: {
    background: '#E8F0FD',
    border: '#CAD9F8',
    text: colors.info
  },
  success: {
    background: '#E4F7EF',
    border: '#C8EBD7',
    text: colors.success
  },
  danger: {
    background: '#F9E4E4',
    border: '#F0C1C1',
    text: colors.danger
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typeScale.xl,
    fontWeight: weights.bold
  },
  sectionSubtitle: {
    color: colors.muted,
    marginTop: 4,
    fontSize: typeScale.sm,
    lineHeight: 18
  },
  button: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  buttonLabel: {
    fontSize: typeScale.md,
    fontWeight: weights.semibold
  },
  buttonIcon: {
    fontSize: typeScale.md
  },
  inputLabel: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weights.semibold,
    marginBottom: 6
  },
  inputWrap: {
    position: 'relative'
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typeScale.md
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top'
  },
  inputRight: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center'
  },
  inputHelper: {
    color: colors.muted,
    fontSize: typeScale.xs,
    marginTop: 6
  },
  searchInput: {
    backgroundColor: colors.surfaceSoft
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  },
  badgeText: {
    fontSize: typeScale.xs,
    fontWeight: weights.semibold
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8
  },
  chipText: {
    fontSize: typeScale.sm,
    fontWeight: weights.semibold
  },
  statCard: {
    flex: 1,
    minWidth: 156
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  statIcon: {
    fontSize: 18
  },
  statHint: {
    fontSize: typeScale.xs,
    fontWeight: weights.semibold
  },
  statValue: {
    fontSize: typeScale.xxl,
    fontWeight: weights.bold,
    marginBottom: 2
  },
  statLabel: {
    fontSize: typeScale.sm,
    fontWeight: weights.medium
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)'
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: typeScale.lg,
    fontWeight: weights.bold
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  toggleLabel: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weights.semibold
  },
  toggleHelper: {
    color: colors.muted,
    fontSize: typeScale.xs,
    marginTop: 3,
    lineHeight: 16
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: spacing.sm
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weights.bold,
    textAlign: 'center'
  },
  emptyDescription: {
    color: colors.muted,
    fontSize: typeScale.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280
  },
  mediaImage: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft
  },
  mediaFallback: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md
  },
  mediaFallbackLabel: {
    color: colors.primaryDark,
    fontSize: typeScale.xl,
    fontWeight: weights.bold,
    letterSpacing: 0.8,
    textAlign: 'center'
  },
  mediaFallbackTitle: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginTop: 6,
    textAlign: 'center'
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  callout: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md
  },
  calloutTitle: {
    fontSize: typeScale.md,
    fontWeight: weights.bold,
    marginBottom: 4
  },
  calloutDescription: {
    fontSize: typeScale.sm,
    lineHeight: 20
  }
});
