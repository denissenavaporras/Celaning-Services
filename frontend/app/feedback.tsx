import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Switch, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api } from "@/src/lib/api";

export default function Feedback() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [info, setInfo] = useState<{ service_name: string; scheduled_date: string; feedback_done: boolean } | null>(null);
  const [rating, setRating] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [recommend, setRecommend] = useState(true);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ code: string; percent: number } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.feedbackInfo(token);
      setInfo(r);
    } catch (e: any) {
      setError(e.message || "Link ungültig");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!token || rating === 0 || clarity === 0) return;
    setSending(true);
    setError("");
    try {
      const r = await api.submitFeedback(token, { rating, clarity, would_recommend: recommend, comment: comment.trim() || undefined });
      setDone({ code: r.coupon_code, percent: r.discount_percent });
    } catch (e: any) {
      setError(e.message || "Fehler beim Senden");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;

  if (!info) {
    return (
      <View style={[styles.center, { padding: spacing.lg }]}>
        <Ionicons name="close-circle" size={48} color={colors.error} />
        <Text style={[styles.title, { marginTop: spacing.md, textAlign: "center" }]}>Link nicht mehr gültig</Text>
        <Text style={[styles.sub, { textAlign: "center" }]}>{error}</Text>
      </View>
    );
  }

  if (info.feedback_done || done) {
    return (
      <View style={[styles.center, { padding: spacing.lg, paddingTop: insets.top }]}>
        <Ionicons name="gift" size={64} color={colors.brandGreen} />
        <Text style={[styles.title, { textAlign: "center", marginTop: spacing.md }]}>Vielen Dank!</Text>
        {done ? (
          <>
            <Text style={[styles.sub, { textAlign: "center" }]}>Ihr {done.percent}% Gutschein ist bereit:</Text>
            <View style={styles.codeBox}><Text testID="coupon-code" style={styles.codeTxt}>{done.code}</Text></View>
            <Text style={[styles.sub, { textAlign: "center", marginTop: spacing.sm }]}>Der Code wartet auch in Ihrer E-Mail. Er gilt 90 Tage für Ihre nächste Buchung.</Text>
          </>
        ) : (
          <Text style={[styles.sub, { textAlign: "center" }]}>Dieses Feedback wurde bereits abgegeben.</Text>
        )}
        <Pressable testID="feedback-home-btn" onPress={() => router.replace("/home")} style={[styles.submit, { marginTop: spacing.xl }]}>
          <Text style={styles.submitTxt}>Zurück zur App</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
      <Text style={styles.title}>Wie war Ihr Service?</Text>
      <Text style={styles.sub}>{info.service_name} · {info.scheduled_date}</Text>

      <Text style={styles.q}>1. Wie zufrieden sind Sie insgesamt?</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} testID={`rating-${n}`} onPress={() => setRating(n)} hitSlop={8}>
            <Ionicons name={rating >= n ? "star" : "star-outline"} size={40} color={rating >= n ? colors.warning : colors.border} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.q}>2. War die Erklärung bei der Buchung klar und verständlich?</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} testID={`clarity-${n}`} onPress={() => setClarity(n)} hitSlop={8}>
            <Ionicons name={clarity >= n ? "star" : "star-outline"} size={40} color={clarity >= n ? colors.warning : colors.border} />
          </Pressable>
        ))}
      </View>

      <View style={styles.recRow}>
        <Text style={[styles.q, { marginTop: 0, flex: 1 }]}>3. Würden Sie uns weiterempfehlen?</Text>
        <Switch testID="recommend-switch" value={recommend} onValueChange={setRecommend} trackColor={{ true: colors.brandGreen, false: colors.border }} thumbColor="#FFFFFF" />
      </View>

      <Text style={styles.q}>4. Haben Sie noch Anmerkungen? (optional)</Text>
      <TextInput testID="comment" value={comment} onChangeText={setComment} placeholder="Was können wir besser machen?" placeholderTextColor={colors.info} multiline numberOfLines={4} style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]} />

      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Pressable testID="feedback-submit" disabled={sending || rating === 0 || clarity === 0} onPress={submit} style={[styles.submit, (sending || rating === 0 || clarity === 0) && { opacity: 0.5 }]}>
        {sending ? <ActivityIndicator color={colors.onBrandPrimary} /> : (
          <>
            <Ionicons name="gift" size={20} color={colors.onBrandPrimary} />
            <Text style={styles.submitTxt}>Feedback senden & 10 % Gutschein erhalten</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "800", color: colors.onSurface },
  sub: { color: colors.onSurfaceTertiary, marginTop: 4 },
  q: { marginTop: spacing.xl, fontSize: typography.sizes.base, fontWeight: "700", color: colors.onSurface },
  stars: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md, paddingHorizontal: spacing.sm },
  recRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xl },
  input: { marginTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingTop: spacing.md, fontSize: typography.sizes.base, color: colors.onSurface },
  err: { color: colors.error, marginTop: spacing.md },
  submit: { marginTop: spacing.xl, minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  submitTxt: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: typography.sizes.base },
  codeBox: { marginTop: spacing.lg, borderWidth: 2, borderColor: colors.brandPrimary, borderStyle: "dashed", borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  codeTxt: { fontSize: 22, fontWeight: "800", letterSpacing: 2, color: colors.brandPrimary },
});
