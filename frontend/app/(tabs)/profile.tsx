import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, Switch, ActivityIndicator,
  RefreshControl, KeyboardAvoidingView, Platform, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, getDeviceId, Booking, Profile, isInvoiceable } from "@/src/lib/api";
import { STATUS_META, formatDate, openInvoice, openMaps } from "@/src/lib/helpers";

const EMPTY: Profile = { name: "", phone: "", email: "", address: "", materials_by_us: false };

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [deviceId, setDeviceId] = useState("");
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fee, setFee] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"history" | "invoices">("history");

  const load = useCallback(async () => {
    try {
      const id = await getDeviceId();
      setDeviceId(id);
      const [p, list, st] = await Promise.all([api.getProfile(id), api.customerBookings(id), api.settings()]);
      setProfile(p);
      setBookings(list);
      setFee(st.materials_fee);
    } catch (e) {
      console.log("profile load err", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save(next: Profile = profile) {
    Keyboard.dismiss();
    setSaving(true);
    try {
      await api.saveProfile(next, deviceId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function toggleMaterials(v: boolean) {
    const next = { ...profile, materials_by_us: v };
    setProfile(next);
    api.saveProfile(next, deviceId).catch(() => {});
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;

  const invoices = bookings.filter(isInvoiceable);
  const initials = profile.name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
      >
        <View style={styles.head}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{profile.name || "Mein Profil"}</Text>
            <Text style={styles.sub}>{bookings.length} Buchung{bookings.length === 1 ? "" : "en"}</Text>
          </View>
        </View>

        {/* Personal data */}
        <Text style={styles.section}>Persönliche Daten</Text>
        <View style={styles.card}>
          {([
            { k: "name", label: "Name", ph: "Vor- und Nachname" },
            { k: "phone", label: "Telefon", ph: "+43 664 …", kb: "phone-pad" },
            { k: "email", label: "E-Mail", ph: "name@beispiel.at", kb: "email-address" },
            { k: "address", label: "Adresse", ph: "Straße, Nr., PLZ, Ort" },
          ] as const).map((f) => (
            <View key={f.k} style={{ marginBottom: spacing.md }}>
              <Text style={styles.inputLabel}>{f.label}</Text>
              <TextInput
                testID={`profile-${f.k}`}
                value={profile[f.k]}
                onChangeText={(v) => setProfile({ ...profile, [f.k]: v })}
                placeholder={f.ph}
                placeholderTextColor={colors.info}
                keyboardType={("kb" in f ? f.kb : "default") as any}
                autoCapitalize={f.k === "email" ? "none" : "sentences"}
                style={styles.input}
              />
            </View>
          ))}
          <Pressable testID="profile-save-btn" onPress={() => save()} disabled={saving} style={styles.saveBtn}>
            {saving ? <ActivityIndicator color={colors.onBrandPrimary} /> : (
              <>
                <Ionicons name={saved ? "checkmark-circle" : "save"} size={18} color={colors.onBrandPrimary} />
                <Text style={styles.saveTxt}>{saved ? "Gespeichert" : "Speichern"}</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Materials */}
        <Text style={styles.section}>Reinigungsmaterial</Text>
        <View style={[styles.card, styles.toggleRow]}>
          <View style={styles.matIcon}><Ionicons name="flask" size={22} color={colors.onGreenTint} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>{profile.materials_by_us ? "Wir bringen das Material mit" : "Ich stelle das Material bereit"}</Text>
            <Text style={styles.sub}>
              {profile.materials_by_us ? `+€${fee.toFixed(2)} pro Reinigungsbuchung` : "Kein Aufpreis"} · Standard für neue Buchungen
            </Text>
          </View>
          <Switch
            testID="profile-materials-switch"
            value={profile.materials_by_us}
            onValueChange={toggleMaterials}
            trackColor={{ true: colors.brandGreen, false: colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* History / invoices */}
        <View style={styles.segment}>
          {(["history", "invoices"] as const).map((t) => (
            <Pressable key={t} testID={`profile-tab-${t}`} onPress={() => setTab(t)} style={[styles.segBtn, tab === t && styles.segOn]}>
              <Text style={[styles.segTxt, tab === t && styles.segTxtOn]}>
                {t === "history" ? "Verlauf" : `Rechnungen (${invoices.length})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === "history" && (bookings.length === 0 ? (
          <View testID="history-empty" style={styles.empty}>
            <Ionicons name="calendar-clear-outline" size={40} color={colors.brandPrimary} />
            <Text style={styles.emptyTxt}>Noch keine Buchungen</Text>
            <Pressable onPress={() => router.push("/book")} style={styles.emptyBtn}><Text style={styles.saveTxt}>Jetzt buchen</Text></Pressable>
          </View>
        ) : bookings.map((b) => (
          <View key={b.id} testID={`history-${b.id}`} style={styles.bCard}>
            <View style={styles.bTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bName}>{b.service_name}</Text>
                <Text style={styles.sub}>
                  {formatDate(b.scheduled_date)} · {b.scheduled_time} Uhr
                  {b.pricing === "quote" ? "" : ` · €${(b.final_price ?? b.service_price).toFixed(2)}`}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: STATUS_META[b.status]?.bg }]}>
                <Text style={[styles.pillTxt, { color: STATUS_META[b.status]?.color }]}>{STATUS_META[b.status]?.label || b.status}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable testID={`history-detail-${b.id}`} onPress={() => router.push({ pathname: "/success", params: { id: b.id } })} style={styles.ghost}>
                <Text style={styles.ghostTxt}>Details</Text>
              </Pressable>
              <Pressable onPress={() => openMaps(b.address)} style={styles.ghost}>
                <Ionicons name="navigate" size={14} color={colors.onBrandSecondary} />
                <Text style={styles.ghostTxt}>Route</Text>
              </Pressable>
              {b.status === "pending_payment" && (
                <Pressable testID={`history-pay-${b.id}`} onPress={() => router.push({ pathname: "/checkout", params: { id: b.id } })} style={styles.solid}>
                  <Text style={styles.solidTxt}>Bezahlen</Text>
                </Pressable>
              )}
              {isInvoiceable(b) && (
                <Pressable testID={`history-invoice-${b.id}`} onPress={() => openInvoice(b.id, deviceId)} style={styles.solid}>
                  <Ionicons name="document-text" size={14} color={colors.onBrandPrimary} />
                  <Text style={styles.solidTxt}>PDF</Text>
                </Pressable>
              )}
            </View>
          </View>
        )))}

        {tab === "invoices" && (invoices.length === 0 ? (
          <View testID="invoices-empty" style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={colors.brandPrimary} />
            <Text style={styles.emptyTxt}>Rechnungen erscheinen hier nach der Zahlung.</Text>
          </View>
        ) : invoices.map((b) => (
          <Pressable key={b.id} testID={`invoice-${b.id}`} onPress={() => openInvoice(b.id, deviceId)} style={[styles.bCard, styles.invRow]}>
            <View style={styles.invIcon}><Ionicons name="document-text" size={22} color={colors.brandPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bName}>{b.invoice_number || "Rechnung"}</Text>
              <Text style={styles.sub}>{b.service_name} · {formatDate(b.scheduled_date)}</Text>
            </View>
            <Text style={styles.invAmount}>€{(b.final_price ?? b.service_price).toFixed(2)}</Text>
            <Ionicons name="download-outline" size={22} color={colors.brandPrimary} />
          </Pressable>
        )))}

        {/* Links */}
        <Text style={styles.section}>Mehr</Text>
        <View style={styles.card}>
          {[
            { k: "info", label: "Über uns & Servicegebiet", icon: "information-circle", to: "/info" },
            { k: "faq", label: "Häufige Fragen", icon: "help-circle", to: "/faq" },
            { k: "privacy", label: "Datenschutzerklärung", icon: "shield-checkmark", to: "/privacy" },
            { k: "admin", label: "Admin-Bereich", icon: "lock-closed", to: "/admin/login" },
          ].map((l, i, arr) => (
            <Pressable key={l.k} testID={`profile-link-${l.k}`} onPress={() => router.push(l.to as any)} style={[styles.linkRow, i < arr.length - 1 && styles.linkDivider]}>
              <Ionicons name={l.icon as any} size={22} color={colors.brandPrimary} />
              <Text style={styles.linkTxt}>{l.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceTertiary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.brandGreen },
  avatarTxt: { color: colors.onBrandPrimary, fontSize: typography.sizes.xl, fontWeight: "800" },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface },
  sub: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  section: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: "600", color: colors.onSurfaceTertiary, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, fontSize: typography.sizes.base, color: colors.onSurface },
  saveBtn: { minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  saveTxt: { color: colors.onBrandPrimary, fontWeight: "800" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  matIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  toggleTitle: { fontSize: typography.sizes.base, fontWeight: "700", color: colors.onSurface },
  segment: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, padding: 4, marginTop: spacing.xl, marginBottom: spacing.md },
  segBtn: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: colors.surfaceSecondary },
  segTxt: { fontWeight: "700", color: colors.onSurfaceTertiary },
  segTxtOn: { color: colors.brandPrimary },
  empty: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  emptyTxt: { color: colors.onSurfaceTertiary, textAlign: "center" },
  emptyBtn: { marginTop: spacing.sm, backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.xl, minHeight: 44, justifyContent: "center", borderRadius: radius.pill },
  bCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  bTop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  bName: { fontSize: typography.sizes.base, fontWeight: "800", color: colors.onSurface },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  pillTxt: { fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  ghost: { flex: 1, minHeight: 40, borderRadius: radius.pill, backgroundColor: colors.brandSecondary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  ghostTxt: { color: colors.onBrandSecondary, fontWeight: "700", fontSize: typography.sizes.sm },
  solid: { flex: 1, minHeight: 40, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  solidTxt: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: typography.sizes.sm },
  invRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  invIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  invAmount: { fontWeight: "800", color: colors.onSurface },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 52 },
  linkDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  linkTxt: { flex: 1, fontSize: typography.sizes.base, fontWeight: "600", color: colors.onSurface },
});
