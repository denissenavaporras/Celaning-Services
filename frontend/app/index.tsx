import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { storage } from "@/src/utils/storage";

const LOGO = require("@/assets/images/logo.png");

const SLIDES = [
  {
    icon: "sparkles",
    title: "Willkommen bei Cleaning Service Wels",
    text: "Reinigung, Gartenpflege, Winterdienst sowie Dach- und PV-Reinigung – alles aus einer Hand.",
    showLogo: true,
  },
  {
    icon: "calendar",
    title: "In 3 Schritten gebucht",
    text: "Was, Wann, Wo – wählen Sie Ihren Service, Ihren Wunschtermin und Ihre Adresse. Fertig!",
  },
  {
    icon: "document-text",
    title: "Alles im Blick",
    text: "Sicher online bezahlen, Termine verfolgen und Rechnungen jederzeit als PDF herunterladen.",
  },
] as const;

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    storage.getItem<boolean>("onboarded", false).then((done) => {
      if (done) router.replace("/home");
      else setChecking(false);
    });
  }, [router]);

  async function finish() {
    await storage.setItem("onboarded", true);
    router.replace("/home");
  }

  function next() {
    if (index >= SLIDES.length - 1) return finish();
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
    setIndex(index + 1);
  }

  if (checking) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <View style={styles.topRow}>
        <Pressable testID="onboarding-skip" onPress={finish} hitSlop={12} style={styles.skipBtn}>
          <Text style={styles.skipText}>Überspringen</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]} testID={`onboarding-slide-${i}`}>
            {"showLogo" in s && s.showLogo ? (
              <Image source={LOGO} style={styles.logo} contentFit="cover" />
            ) : (
              <View style={styles.iconCircle}>
                <Ionicons name={s.icon as any} size={64} color={colors.brandPrimary} />
              </View>
            )}
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.text}>{s.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <Pressable testID="onboarding-next" onPress={next} style={styles.cta}>
        <Text style={styles.ctaText}>{index === SLIDES.length - 1 ? "Los geht's" : "Weiter"}</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.onBrandPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary },
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  topRow: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  skipBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  skipText: { color: colors.onSurfaceTertiary, fontWeight: "600", fontSize: typography.sizes.base },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xxl },
  logo: { width: 260, height: 260, marginBottom: spacing.md },
  iconCircle: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.xxl,
    borderWidth: 4, borderColor: colors.brandGreen,
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  text: { fontSize: typography.sizes.lg, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.md, lineHeight: 24 },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, marginBottom: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.brandGreen },
  cta: {
    marginHorizontal: spacing.lg, backgroundColor: colors.brandPrimary, borderRadius: radius.pill,
    minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
  },
  ctaText: { color: colors.onBrandPrimary, fontSize: typography.sizes.lg, fontWeight: "800" },
});
