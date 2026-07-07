import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, Service } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";

type Form = {
  id?: string;
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  image_url: string;
  active: boolean;
};

const EMPTY: Form = { name: "", description: "", price: "", duration_minutes: "120", image_url: "", active: true };

export default function AdminServices() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const token = await storage.secureGet<string>("admin_token", "");
      if (!token) return router.replace("/admin/login");
      const r = await api.adminListServices();
      setItems(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  function edit(s: Service) {
    setForm({
      id: s.id,
      name: s.name,
      description: s.description,
      price: String(s.price),
      duration_minutes: String(s.duration_minutes),
      image_url: s.image_url || "",
      active: s.active,
    });
    setShowForm(true);
  }
  function newItem() {
    setForm(EMPTY);
    setShowForm(true);
  }

  async function save() {
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        duration_minutes: parseInt(form.duration_minutes, 10),
        image_url: form.image_url.trim() || undefined,
        active: form.active,
      };
      if (!payload.name || !payload.description || Number.isNaN(payload.price)) {
        throw new Error("Bitte alle Pflichtfelder ausfüllen");
      }
      if (form.id) await api.updateService(form.id, payload);
      else await api.createService(payload);
      setShowForm(false);
      setForm(EMPTY);
      setLoading(true);
      load();
    } catch (e: any) {
      setError(e.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api.deleteService(id);
    setLoading(true);
    load();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Services und Preise</Text>
        <Pressable testID="add-service-btn" onPress={newItem} style={[styles.headerBtn, { backgroundColor: colors.brandPrimary }]}>
          <Ionicons name="add" size={22} color={colors.onBrandPrimary} />
        </Pressable>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="pricetags-outline" size={40} color={colors.brandPrimary} />
              <Text style={styles.emptyTxt}>Keine Services. Fügen Sie den ersten hinzu.</Text>
            </View>
          ) : items.map((s) => (
            <View key={s.id} testID={`svc-${s.id}`} style={styles.card}>
              {s.image_url ? <Image source={s.image_url} style={styles.thumb} contentFit="cover" /> : null}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Text style={styles.cardName}>{s.name}</Text>
                  {!s.active && (
                    <View style={styles.inactive}>
                      <Text style={styles.inactiveTxt}>Inaktiv</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>{s.description}</Text>
                <View style={{ flexDirection: "row", gap: spacing.md, marginTop: 4 }}>
                  <Text style={styles.cardPrice}>€{s.price.toFixed(0)}</Text>
                  <Text style={styles.cardMeta}>{s.duration_minutes} Min.</Text>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                  <Pressable testID={`edit-${s.id}`} onPress={() => edit(s)} style={styles.smallBtn}>
                    <Ionicons name="create-outline" size={14} color={colors.onBrandSecondary} />
                    <Text style={styles.smallBtnTxt}>Bearbeiten</Text>
                  </Pressable>
                  <Pressable testID={`del-${s.id}`} onPress={() => remove(s.id)} style={[styles.smallBtn, { backgroundColor: "#FFE3E1" }]}>
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                    <Text style={[styles.smallBtnTxt, { color: colors.error }]}>Löschen</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{form.id ? "Service bearbeiten" : "Neuer Service"}</Text>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                testID="form-name"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="z.B. Express-Reinigung"
                placeholderTextColor={colors.info}
                style={styles.input}
              />
              <Text style={styles.inputLabel}>Beschreibung</Text>
              <TextInput
                testID="form-desc"
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                placeholder="Was ist enthalten"
                placeholderTextColor={colors.info}
                style={[styles.input, { height: 80 }]}
                multiline
              />
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Preis (EUR)</Text>
                  <TextInput
                    testID="form-price"
                    value={form.price}
                    onChangeText={(v) => setForm({ ...form, price: v.replace(/[^0-9.]/g, "") })}
                    placeholder="45"
                    placeholderTextColor={colors.info}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Dauer (Min.)</Text>
                  <TextInput
                    testID="form-duration"
                    value={form.duration_minutes}
                    onChangeText={(v) => setForm({ ...form, duration_minutes: v.replace(/\D/g, "") })}
                    placeholder="120"
                    placeholderTextColor={colors.info}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
              </View>
              <Text style={styles.inputLabel}>Bild-URL</Text>
              <TextInput
                testID="form-image"
                value={form.image_url}
                onChangeText={(v) => setForm({ ...form, image_url: v })}
                placeholder="https://..."
                placeholderTextColor={colors.info}
                style={styles.input}
                autoCapitalize="none"
              />
              <Pressable
                testID="form-active-toggle"
                onPress={() => setForm({ ...form, active: !form.active })}
                style={[styles.toggle, form.active && styles.toggleOn]}
              >
                <Ionicons name={form.active ? "checkmark-circle" : "close-circle"} size={18} color={form.active ? colors.brandPrimary : colors.info} />
                <Text style={styles.toggleTxt}>{form.active ? "Aktiv (für Kunden sichtbar)" : "Inaktiv"}</Text>
              </Pressable>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable testID="form-save-btn" onPress={save} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
                {saving ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.saveBtnTxt}>Speichern</Text>}
              </Pressable>
              <Pressable testID="form-cancel-btn" onPress={() => setShowForm(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnTxt}>Abbrechen</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surface,
  },
  headerBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  emptyTxt: { color: colors.onSurfaceTertiary },

  card: {
    flexDirection: "row", gap: spacing.md, backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  cardName: { fontSize: typography.sizes.base, fontWeight: "700", color: colors.onSurface },
  cardDesc: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  cardPrice: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.brandPrimary },
  cardMeta: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, alignSelf: "center" },
  inactive: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.divider },
  inactiveTxt: { fontSize: 10, color: colors.onSurfaceTertiary, fontWeight: "700" },
  smallBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.brandSecondary,
  },
  smallBtnTxt: { color: colors.onBrandSecondary, fontSize: typography.sizes.sm, fontWeight: "700" },

  sheet: {
    backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, maxHeight: "92%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.md },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: "600", color: colors.onSurfaceTertiary, marginBottom: 6, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: typography.sizes.base, color: colors.onSurface, minHeight: 48,
  },
  toggle: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg,
    padding: spacing.md, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md,
  },
  toggleOn: { backgroundColor: colors.brandTertiary },
  toggleTxt: { fontSize: typography.sizes.base, color: colors.onSurface, fontWeight: "600" },
  error: { color: colors.error, marginTop: spacing.md, textAlign: "center" },
  saveBtn: { backgroundColor: colors.brandPrimary, paddingVertical: 14, borderRadius: radius.pill, alignItems: "center", marginTop: spacing.lg },
  saveBtnTxt: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: typography.sizes.base },
  cancelBtn: { paddingVertical: 12, alignItems: "center", marginTop: spacing.sm },
  cancelBtnTxt: { color: colors.onSurfaceTertiary, fontWeight: "600" },
});
