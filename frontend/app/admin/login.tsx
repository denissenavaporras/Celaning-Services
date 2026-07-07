import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@limpia.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    storage.secureGet<string>("admin_token", "").then((t) => {
      if (t) router.replace("/admin");
    });
  }, []);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const r = await api.adminLogin(email.trim().toLowerCase(), password);
      await storage.secureSet("admin_token", r.access_token);
      router.replace("/admin");
    } catch (e: any) {
      setError(e.message || "Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.replace("/")} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Acceso administrador</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBox}>
            <View style={styles.brandIcon}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={{ width: 64, height: 64 }}
                contentFit="contain"
              />
            </View>
            <Text style={styles.brandTitle}>Panel de agenda</Text>
            <Text style={styles.brandText}>Ingresa con tus credenciales para ver todas las citas y rutas.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>Correo electrónico</Text>
            <TextInput
              testID="admin-email"
              value={email}
              onChangeText={setEmail}
              placeholder="admin@limpia.com"
              placeholderTextColor={colors.info}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={styles.input}
            />
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              testID="admin-password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.info}
              secureTextEntry
              style={styles.input}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable testID="admin-login-btn" onPress={submit} disabled={loading} style={[styles.btn, loading && { opacity: 0.6 }]}>
              {loading ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.btnTxt}>Ingresar</Text>}
            </Pressable>

            <Text style={styles.helper}>Cuenta demo pre-configurada: admin@limpia.com / admin123</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surface,
  },
  backBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },

  brandBox: { alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.xl },
  brandIcon: { width: 84, height: 84, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  brandTitle: { fontSize: typography.sizes.xxl, fontWeight: "800", color: colors.onSurface, marginTop: spacing.md },
  brandText: { fontSize: typography.sizes.base, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.sm, paddingHorizontal: spacing.xl },

  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: "600", color: colors.onSurfaceTertiary, marginBottom: 6, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: typography.sizes.base, color: colors.onSurface, minHeight: 48,
  },
  error: { color: colors.error, marginTop: spacing.md, textAlign: "center", fontSize: typography.sizes.sm },
  btn: {
    backgroundColor: colors.brandPrimary, paddingVertical: 14, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center", marginTop: spacing.lg,
  },
  btnTxt: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: typography.sizes.base },
  helper: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.md },
});
