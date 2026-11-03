import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, Service } from "@/src/lib/api";
import { openWhatsApp } from "@/src/lib/helpers";

export default function ServiceDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [svc, setSvc] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [fee, setFee] = useState(10);

  useEffect(() => {
    Promise.all([api.listServices(), api.settings()])
      .then(([list, st]) => {
        setSvc(list.find((s) => s.id === id) || null);
        setFee(st.materials_fee);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;
  if (!svc) return <View style={styles.center}><Text>Service nicht gefunden</Text></View>;

  const quote = svc.pricing === "quote";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={svc.image_url} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <LinearGradient colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0)", "rgba(13,79,140,0.85)"]} style={StyleSheet.absoluteFillObject} />
          <Pressable testID="detail-back-btn" onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + spacing.sm }]}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <View style={styles.heroText}>
            <Text style={styles.cat}>{svc.category}</Text>
            <Text testID="detail-title" style={styles.title}>{svc.name}</Text>
          </View>
        </View>

        <View style={{ padding: spacing.lg }}>
          <View style={styles.priceCard}>
            <Ionicons name={quote ? "document-text" : "time"} size={24} color={colors.brandPrimary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.priceLabel}>{quote ? "Preis" : "Stundensatz"}</Text>
              <Text style={styles.priceValue}>{quote ? "Individuelles Angebot" : `€${svc.price.toFixed(0)} pro Stunde`}</Text>
              {!quote && <Text style={styles.priceHint}>Mindestens {svc.min_hours} Stunden</Text>}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Leistungsbeschreibung</Text>
          <Text style={styles.desc}>{svc.description}</Text>

          {!quote && (
            <View style={styles.infoBox}>
              <Ionicons name="flask" size={20} color={colors.onGreenTint} />
              <Text style={styles.infoText}>
                Reinigungsmaterial: Sie stellen es bereit – oder wir bringen alles mit (+€{fee.toFixed(0)} pro Buchung).
              </Text>
            </View>
          )}
          {quote && (
            <View style={styles.infoBox}>
              <Ionicons name="chatbubbles" size={20} color={colors.onGreenTint} />
              <Text style={styles.infoText}>
                Senden Sie uns Ihre Anfrage mit Wunschtermin und Adresse. Wir melden uns schnellstmöglich mit einem unverbindlichen Angebot.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable testID="detail-whatsapp-btn" onPress={() => openWhatsApp(`Hallo! Ich interessiere mich für: ${svc.name}`)} style={styles.waBtn}>
          <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
        </Pressable>
        <Pressable
          testID="detail-book-btn"
          onPress={() => router.push({ pathname: "/book", params: { serviceId: svc.id } })}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>{quote ? "Angebot anfordern" : "Jetzt buchen"}</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  hero: { height: 300, justifyContent: "flex-end" },
  backBtn: { position: "absolute", left: spacing.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  heroText: { padding: spacing.lg },
  cat: { color: colors.brandGreen, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", fontSize: typography.sizes.sm },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginTop: 4 },
  priceCard: { flexDirection: "row", gap: spacing.md, alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  priceLabel: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary },
  priceValue: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.brandPrimary, marginTop: 2 },
  priceHint: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.sm },
  desc: { fontSize: typography.sizes.lg, color: colors.onSurfaceSecondary, lineHeight: 24 },
  infoBox: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl, backgroundColor: colors.greenTint, borderRadius: radius.md, padding: spacing.lg },
  infoText: { flex: 1, color: colors.onSurfaceSecondary, fontSize: typography.sizes.base, lineHeight: 20 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border },
  waBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.whatsapp, alignItems: "center", justifyContent: "center" },
  cta: { flex: 1, minHeight: 56, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  ctaText: { color: colors.onBrandPrimary, fontSize: typography.sizes.lg, fontWeight: "800" },
});
