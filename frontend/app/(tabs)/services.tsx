import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, Service } from "@/src/lib/api";
import { CATEGORIES } from "@/src/lib/helpers";

export default function ServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cat } = useLocalSearchParams<{ cat?: string }>();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("Alle");

  const load = useCallback(async () => {
    try {
      setServices(await api.listServices());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (cat) setFilter(cat); }, [cat]);

  const shown = filter === "Alle" ? services : services.filter((s) => s.category === filter);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={styles.title}>Services</Text>
        <Text style={styles.subtitle}>Alles für Haus, Garten und Dach</Text>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {["Alle", ...CATEGORIES.map((c) => c.key)].map((f) => {
            const sel = f === filter;
            return (
              <Pressable key={f} testID={`filter-${f}`} onPress={() => setFilter(f)} style={[styles.chip, sel && styles.chipSel]}>
                <Text style={[styles.chipText, sel && styles.chipTextSel]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
        >
          {shown.map((s) => (
            <Pressable
              key={s.id}
              testID={`service-item-${s.id}`}
              onPress={() => router.push({ pathname: "/service/[id]", params: { id: s.id } })}
              style={styles.card}
            >
              <Image source={s.image_url} style={styles.img} contentFit="cover" transition={150} />
              <View style={styles.body}>
                <View style={styles.rowTop}>
                  <View style={styles.iconBox}>
                    <Ionicons name={(s.icon || "sparkles") as any} size={22} color={colors.brandPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cat}>{s.category}</Text>
                    <Text style={styles.name}>{s.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={colors.onSurfaceTertiary} />
                </View>
                <Text style={styles.desc} numberOfLines={2}>{s.description}</Text>
                <View style={[styles.pricePill, s.pricing === "quote" && { backgroundColor: colors.greenTint }]}>
                  <Text style={[styles.priceText, s.pricing === "quote" && { color: colors.onGreenTint }]}>
                    {s.pricing === "quote" ? "Preis auf Anfrage" : `€${s.price.toFixed(0)} / Std. · ab ${s.min_hours} Std.`}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
          {shown.length === 0 && <Text style={styles.empty}>Keine Services in dieser Kategorie.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface },
  subtitle: { fontSize: typography.sizes.base, color: colors.onSurfaceTertiary, marginTop: 4 },
  filters: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, minHeight: 40, borderRadius: radius.pill, justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  chipSel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontWeight: "600", color: colors.onSurface },
  chipTextSel: { color: colors.onBrandPrimary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: spacing.lg },
  img: { width: "100%", height: 130 },
  body: { padding: spacing.lg },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconBox: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  cat: { fontSize: 11, fontWeight: "700", color: colors.onGreenTint, letterSpacing: 1, textTransform: "uppercase" },
  name: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  desc: { fontSize: typography.sizes.base, color: colors.onSurfaceTertiary, marginTop: spacing.md, lineHeight: 20 },
  pricePill: { alignSelf: "flex-start", marginTop: spacing.md, backgroundColor: colors.brandTertiary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  priceText: { fontWeight: "800", color: colors.brandPrimary, fontSize: typography.sizes.sm },
  empty: { textAlign: "center", color: colors.onSurfaceTertiary, marginTop: spacing.xl },
});
