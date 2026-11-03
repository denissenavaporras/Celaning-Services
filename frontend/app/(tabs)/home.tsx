import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, getDeviceId, Booking } from "@/src/lib/api";
import { CATEGORIES, STATUS_META, formatDate, openWhatsApp } from "@/src/lib/helpers";

const LOGO = require("@/assets/images/logo.png");

const PROMOS = [
  {
    title: "10 % Willkommensrabatt",
    text: "Für Ihre erste Reinigung mit dem Code",
    code: "WILLKOMMEN10",
    icon: "gift",
    gradient: [colors.brandPrimary, colors.brandDeep] as const,
  },
  {
    title: "Winterdienst jetzt sichern",
    text: "Schneeräumung in Wels, Amberg & Gramastetten",
    code: null,
    icon: "snow",
    gradient: ["#2B8FE0", "#0D4F8C"] as const,
  },
  {
    title: "Freundin empfehlen",
    text: "€50 Empfehlungsbonus mit dem Code",
    code: "FREUNDIN2H",
    icon: "people",
    gradient: ["#6FA82E", "#4E7A17"] as const,
  },
  {
    title: "Mehr Sonnenstrom",
    text: "Saubere PV-Anlagen liefern mehr Leistung",
    code: null,
    icon: "sunny",
    gradient: ["#1572C4", "#6FA82E"] as const,
  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bannerW = width - spacing.lg * 2;
  const bannerRef = useRef<ScrollView>(null);
  const [slide, setSlide] = useState(0);
  const [name, setName] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const id = await getDeviceId();
      const [list, profile] = await Promise.all([api.customerBookings(id), api.getProfile(id)]);
      setBookings(list);
      setName(profile.name?.split(" ")[0] || "");
    } catch (e) {
      console.log("home load err", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const t = setInterval(() => {
      setSlide((s) => {
        const n = (s + 1) % PROMOS.length;
        bannerRef.current?.scrollTo({ x: n * (bannerW + spacing.md), animated: true });
        return n;
      });
    }, 4500);
    return () => clearInterval(t);
  }, [bannerW]);

  const next = bookings.find((b) => !["cancelled", "completed"].includes(b.status));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text testID="home-greeting" style={styles.greeting}>
            {greeting()}{name ? `, ${name}` : ""}!
          </Text>
          <Text style={styles.subGreeting}>Was dürfen wir heute für Sie erledigen?</Text>
        </View>
        <Image source={LOGO} style={styles.logo} contentFit="cover" />
      </View>

      {/* Promo banner */}
      <ScrollView
        ref={bannerRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={bannerW + spacing.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
        onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / (bannerW + spacing.md)))}
        testID="promo-banner"
      >
        {PROMOS.map((p, i) => (
          <LinearGradient
            key={i}
            colors={p.gradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.promo, { width: bannerW }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>{p.title}</Text>
              <Text style={styles.promoText}>{p.text}</Text>
              {p.code ? (
                <View style={styles.codePill}>
                  <Text style={styles.codeText}>{p.code}</Text>
                </View>
              ) : null}
            </View>
            <Ionicons name={p.icon as any} size={56} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {PROMOS.map((_, i) => <View key={i} style={[styles.dot, i === slide && styles.dotActive]} />)}
      </View>

      {/* Big actions */}
      <View style={styles.section}>
        <Pressable testID="home-book-btn" onPress={() => router.push("/book")} style={styles.bigPrimary}>
          <View style={styles.bigIcon}><Ionicons name="calendar" size={26} color={colors.brandPrimary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bigTitle}>Jetzt buchen</Text>
            <Text style={styles.bigSub}>In 3 Schritten zum Termin</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.onBrandPrimary} />
        </Pressable>
        <Pressable testID="home-whatsapp-btn" onPress={() => openWhatsApp()} style={styles.bigSecondary}>
          <View style={[styles.bigIcon, { backgroundColor: colors.whatsapp }]}><Ionicons name="logo-whatsapp" size={26} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bigTitleDark}>Angebot per WhatsApp</Text>
            <Text style={styles.bigSubDark}>Schnelle Antwort, unverbindlich</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.onSurfaceTertiary} />
        </Pressable>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unsere Leistungen</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              testID={`home-cat-${c.key}`}
              onPress={() => router.push({ pathname: "/services", params: { cat: c.key } })}
              style={styles.catTile}
            >
              <View style={styles.catIcon}><Ionicons name={c.icon as any} size={28} color={colors.brandPrimary} /></View>
              <Text style={styles.catLabel}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Next booking */}
      {next ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ihr nächster Termin</Text>
          <Pressable
            testID="home-next-booking"
            onPress={() => router.push({ pathname: "/success", params: { id: next.id } })}
            style={styles.nextCard}
          >
            <View style={styles.nextDate}>
              <Text style={styles.nextDay}>{new Date(next.scheduled_date + "T00:00:00").getDate()}</Text>
              <Text style={styles.nextMon}>{formatDate(next.scheduled_date, { month: "short" }).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextName}>{next.service_name}</Text>
              <Text style={styles.nextMeta}>{next.scheduled_time} Uhr · {next.address}</Text>
              <View style={[styles.pill, { backgroundColor: STATUS_META[next.status]?.bg }]}>
                <Text style={[styles.pillTxt, { color: STATUS_META[next.status]?.color }]}>{STATUS_META[next.status]?.label}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      ) : null}

      {/* Local SEO */}
      <View style={styles.section}>
        <View style={styles.localBox}>
          <Ionicons name="location" size={22} color={colors.onGreenTint} />
          <View style={{ flex: 1 }}>
            <Text style={styles.localTitle}>Ihr Reinigungsservice in Wels</Text>
            <Text style={styles.localText}>
              Professioneller Reinigungsservice Wels, zuverlässige Schneeräumung Amberg und Winterdienst Gramastetten –
              dazu Gartenpflege sowie Dach- & PV-Reinigung in ganz Oberösterreich.
            </Text>
          </View>
        </View>
        <Pressable testID="home-info-link" onPress={() => router.push("/info")} style={styles.linkRow}>
          <Text style={styles.linkText}>Mehr über uns erfahren</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.brandPrimary} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, marginBottom: spacing.lg, gap: spacing.md },
  greeting: { fontSize: 28, fontWeight: "800", color: colors.onSurface },
  subGreeting: { fontSize: typography.sizes.base, color: colors.onSurfaceTertiary, marginTop: 4 },
  logo: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },

  promo: { borderRadius: radius.lg, padding: spacing.lg, minHeight: 140, flexDirection: "row", alignItems: "center", gap: spacing.md },
  promoTitle: { color: "#FFFFFF", fontSize: typography.sizes.xl, fontWeight: "800" },
  promoText: { color: "rgba(255,255,255,0.9)", fontSize: typography.sizes.base, marginTop: 4 },
  codePill: { alignSelf: "flex-start", marginTop: spacing.md, backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", borderStyle: "dashed" },
  codeText: { color: "#FFFFFF", fontWeight: "800", letterSpacing: 1.5 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.brandGreen },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionTitle: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.md },

  bigPrimary: {
    backgroundColor: colors.brandPrimary, borderRadius: radius.lg, padding: spacing.lg, minHeight: 84,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
  },
  bigSecondary: {
    marginTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, minHeight: 84,
    flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  bigIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  bigTitle: { color: colors.onBrandPrimary, fontSize: typography.sizes.xl, fontWeight: "800" },
  bigSub: { color: "rgba(255,255,255,0.85)", fontSize: typography.sizes.base, marginTop: 2 },
  bigTitleDark: { color: colors.onSurface, fontSize: typography.sizes.lg, fontWeight: "800" },
  bigSubDark: { color: colors.onSurfaceTertiary, fontSize: typography.sizes.base, marginTop: 2 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  catTile: {
    width: "47.5%", backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, minHeight: 110, justifyContent: "space-between",
  },
  catIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface, marginTop: spacing.md },

  nextCard: {
    flexDirection: "row", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: "center",
  },
  nextDate: { width: 60, height: 64, borderRadius: radius.md, backgroundColor: colors.greenTint, alignItems: "center", justifyContent: "center" },
  nextDay: { fontSize: 24, fontWeight: "800", color: colors.onGreenTint },
  nextMon: { fontSize: 11, fontWeight: "700", color: colors.onGreenTint },
  nextName: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },
  nextMeta: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  pill: { alignSelf: "flex-start", marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  pillTxt: { fontSize: 11, fontWeight: "700" },

  localBox: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.greenTint, borderRadius: radius.lg, padding: spacing.lg },
  localTitle: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.onSurface },
  localText: { fontSize: typography.sizes.base, color: colors.onSurfaceSecondary, marginTop: 4, lineHeight: 20 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48 },
  linkText: { color: colors.brandPrimary, fontWeight: "700", fontSize: typography.sizes.base },
});
