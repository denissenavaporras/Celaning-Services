import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { useAuth } from "@/src/ctx/AuthContext";

const LOGO = require("@/assets/images/logo.png");

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      if (redirect) router.replace(redirect as any);
      else router.back();
    } catch (e: any) {
      setError(e.message || "Anmeldung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <Pressable testID="login-close" onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </Pressable>
        <Image source={LOGO} style={styles.logo} contentFit="cover" />
        <Text style={styles.title}>Willkommen zurück</Text>
        <Text style={styles.sub}>Melden Sie sich an, um Ihre Buchungen, Rechnungen und Belohnungen zu verwalten.</Text>

        <Text style={styles.label}>E-Mail</Text>
        <TextInput testID="login-email" value={email} onChangeText={setEmail} placeholder="name@beispiel.at" placeholderTextColor={colors.info} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={styles.input} />

        <Text style={styles.label}>Passwort</Text>
        <View style={styles.pwRow}>
          <TextInput testID="login-password" value={password} onChangeText={setPassword} placeholder="Mindestens 8 Zeichen" placeholderTextColor={colors.info} secureTextEntry={!showPw} autoCapitalize="none" autoComplete="password" style={[styles.input, { flex: 1, borderWidth: 0 }]} />
          <Pressable onPress={() => setShowPw(!showPw)} hitSlop={10} style={styles.eye}>
            <Ionicons name={showPw ? "eye-off" : "eye"} size={20} color={colors.onSurfaceTertiary} />
          </Pressable>
        </View>

        <Link href="/auth/forgot" style={styles.forgotLink} asChild>
          <Pressable><Text style={styles.linkTxt}>Passwort vergessen?</Text></Pressable>
        </Link>

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <Pressable testID="login-submit" disabled={loading || !email.trim() || password.length < 8} onPress={submit} style={[styles.btn, (loading || !email.trim() || password.length < 8) && { opacity: 0.5 }]}>
          {loading ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.btnTxt}>Anmelden</Text>}
        </Pressable>

        <View style={styles.row}>
          <Text style={{ color: colors.onSurfaceTertiary }}>Noch kein Konto?</Text>
          <Link href={{ pathname: "/auth/register", params: { redirect: redirect || "" } }} asChild>
            <Pressable testID="to-register"><Text style={styles.linkTxt}> Registrieren</Text></Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg },
  close: { position: "absolute", right: spacing.lg, top: spacing.lg, zIndex: 2, minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  logo: { width: 80, height: 80, borderRadius: 40, alignSelf: "center", marginBottom: spacing.md },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  sub: { color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 20 },
  label: { fontSize: typography.sizes.sm, fontWeight: "600", color: colors.onSurfaceTertiary, marginBottom: 6, marginTop: spacing.md },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 48, fontSize: typography.sizes.base, color: colors.onSurface },
  pwRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
  eye: { paddingHorizontal: spacing.md, height: 48, alignItems: "center", justifyContent: "center" },
  forgotLink: { alignSelf: "flex-end", marginTop: spacing.sm, minHeight: 36, justifyContent: "center" },
  linkTxt: { color: colors.brandPrimary, fontWeight: "700" },
  err: { color: colors.error, marginTop: spacing.md, fontSize: typography.sizes.sm },
  btn: { marginTop: spacing.xl, minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  btnTxt: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: typography.sizes.lg },
  row: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
});
