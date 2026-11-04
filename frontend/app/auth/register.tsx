import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { useAuth } from "@/src/ctx/AuthContext";

const LOGO = require("@/assets/images/logo.png");

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const valid = name.trim().length >= 2 && /@/.test(email) && password.length >= 8;

  async function submit() {
    setLoading(true);
    setError("");
    try {
      await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, referral_code: referral.trim() || undefined });
      if (redirect) router.replace(redirect as any);
      else router.back();
    } catch (e: any) {
      setError(e.message || "Registrierung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <Pressable testID="register-close" onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </Pressable>
        <Image source={LOGO} style={styles.logo} contentFit="cover" />
        <Text style={styles.title}>Konto erstellen</Text>
        <Text style={styles.sub}>Sammeln Sie Treuepunkte, laden Sie Rechnungen herunter und empfehlen Sie uns weiter.</Text>

        {([
          { k: "name", label: "Vollständiger Name", v: name, set: setName, ph: "Maria Huber", test: "register-name" },
          { k: "email", label: "E-Mail", v: email, set: setEmail, ph: "name@beispiel.at", test: "register-email", kb: "email-address" as const, cap: "none" as const },
          { k: "phone", label: "Telefon (optional)", v: phone, set: setPhone, ph: "+43 664 …", test: "register-phone", kb: "phone-pad" as const },
        ]).map((f) => (
          <View key={f.k}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput testID={f.test} value={f.v} onChangeText={f.set} placeholder={f.ph} placeholderTextColor={colors.info} keyboardType={f.kb || "default"} autoCapitalize={f.cap || "sentences"} style={styles.input} />
          </View>
        ))}

        <Text style={styles.label}>Passwort</Text>
        <View style={styles.pwRow}>
          <TextInput testID="register-password" value={password} onChangeText={setPassword} placeholder="Mindestens 8 Zeichen" placeholderTextColor={colors.info} secureTextEntry={!showPw} autoCapitalize="none" style={[styles.input, { flex: 1, borderWidth: 0 }]} />
          <Pressable onPress={() => setShowPw(!showPw)} hitSlop={10} style={styles.eye}>
            <Ionicons name={showPw ? "eye-off" : "eye"} size={20} color={colors.onSurfaceTertiary} />
          </Pressable>
        </View>

        <Text style={styles.label}>Empfehlungscode (optional)</Text>
        <TextInput testID="register-referral" value={referral} onChangeText={(v) => setReferral(v.toUpperCase())} placeholder="WEL-XXXX…" placeholderTextColor={colors.info} autoCapitalize="characters" style={styles.input} />
        <Text style={styles.hint}>Freund oder Freundin hat Sie eingeladen? Mit dem Code erhalten Sie beide einen Gutschein.</Text>

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <Pressable testID="register-submit" disabled={loading || !valid} onPress={submit} style={[styles.btn, (loading || !valid) && { opacity: 0.5 }]}>
          {loading ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.btnTxt}>Konto erstellen</Text>}
        </Pressable>

        <View style={styles.row}>
          <Text style={{ color: colors.onSurfaceTertiary }}>Schon registriert?</Text>
          <Link href={{ pathname: "/auth/login", params: { redirect: redirect || "" } }} asChild>
            <Pressable testID="to-login"><Text style={styles.linkTxt}> Anmelden</Text></Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg },
  close: { position: "absolute", right: spacing.lg, top: spacing.lg, zIndex: 2, minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  logo: { width: 72, height: 72, borderRadius: 36, alignSelf: "center", marginBottom: spacing.md },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  sub: { color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 20 },
  label: { fontSize: typography.sizes.sm, fontWeight: "600", color: colors.onSurfaceTertiary, marginBottom: 6, marginTop: spacing.md },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 48, fontSize: typography.sizes.base, color: colors.onSurface },
  pwRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
  eye: { paddingHorizontal: spacing.md, height: 48, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 4 },
  linkTxt: { color: colors.brandPrimary, fontWeight: "700" },
  err: { color: colors.error, marginTop: spacing.md, fontSize: typography.sizes.sm },
  btn: { marginTop: spacing.xl, minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  btnTxt: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: typography.sizes.lg },
  row: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
});
