import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api } from "@/src/lib/api";

export default function Forgot() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (e: any) {
      setError(e.message || "Bitte versuchen Sie es erneut");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + spacing.lg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <Pressable testID="forgot-close" onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </Pressable>
        <Ionicons name="key" size={44} color={colors.brandPrimary} style={{ alignSelf: "center", marginBottom: spacing.md }} />
        <Text style={styles.title}>Passwort zurücksetzen</Text>
        <Text style={styles.sub}>Geben Sie die E-Mail Ihres Kontos ein. Wir senden Ihnen einen Link, um ein neues Passwort zu setzen.</Text>

        {sent ? (
          <View style={styles.info}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.infoTxt}>Falls ein Konto mit dieser E-Mail existiert, haben wir Ihnen einen Link geschickt. Prüfen Sie auch den Spam-Ordner.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>E-Mail</Text>
            <TextInput testID="forgot-email" value={email} onChangeText={setEmail} placeholder="name@beispiel.at" placeholderTextColor={colors.info} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={styles.input} />
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <Pressable testID="forgot-submit" disabled={loading || !email.trim()} onPress={submit} style={[styles.btn, (loading || !email.trim()) && { opacity: 0.5 }]}>
              {loading ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.btnTxt}>Link senden</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  close: { position: "absolute", right: spacing.lg, top: 0, zIndex: 2, minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  sub: { color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 20 },
  label: { fontSize: typography.sizes.sm, fontWeight: "600", color: colors.onSurfaceTertiary, marginBottom: 6, marginTop: spacing.md },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 48, fontSize: typography.sizes.base, color: colors.onSurface },
  err: { color: colors.error, marginTop: spacing.md, fontSize: typography.sizes.sm },
  btn: { marginTop: spacing.xl, minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  btnTxt: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: typography.sizes.lg },
  info: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.greenTint, borderRadius: radius.md, padding: spacing.lg },
  infoTxt: { flex: 1, color: colors.onSurfaceSecondary, lineHeight: 20 },
});
