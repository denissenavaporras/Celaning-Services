import { Linking, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { colors } from "@/src/lib/theme";
import { invoiceUrl } from "@/src/lib/api";

export const WHATSAPP_NUMBER = "436641019869";

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  quote_requested: { label: "Angebot angefragt", color: colors.onGreenTint, bg: colors.greenTint },
  pending_payment: { label: "Zahlung ausstehend", color: colors.warning, bg: "#FFF3E0" },
  paid: { label: "Bezahlt", color: colors.brandPrimary, bg: colors.brandSecondary },
  confirmed: { label: "Bestätigt", color: colors.brandPrimary, bg: colors.brandSecondary },
  in_progress: { label: "In Bearbeitung", color: colors.brandPrimary, bg: colors.brandTertiary },
  completed: { label: "Abgeschlossen", color: colors.onGreenTint, bg: colors.greenTint },
  cancelled: { label: "Storniert", color: colors.error, bg: "#FFE3E1" },
};

export const CATEGORIES = [
  { key: "Reinigung", label: "Reinigung", icon: "sparkles" },
  { key: "Garten", label: "Garten", icon: "leaf" },
  { key: "Winterdienst", label: "Winterdienst", icon: "snow" },
  { key: "Dach & PV", label: "Dach & PV", icon: "sunny" },
] as const;

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "2-digit", month: "short" }) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", opts);
}

export function euro(v: number) {
  return `€${v.toFixed(2).replace(".", ",")}`;
}

export function openMaps(address: string) {
  const q = encodeURIComponent(address);
  const url = Platform.select({
    ios: `http://maps.apple.com/?q=${q}`,
    android: `geo:0,0?q=${q}`,
    default: `https://www.google.com/maps/search/?api=1&query=${q}`,
  })!;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
}

export function openWhatsApp(text = "Hallo! Ich hätte gerne ein Angebot.") {
  Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`);
}

export async function openInvoice(bookingId: string, deviceId: string) {
  const url = invoiceUrl(bookingId, deviceId);
  if (Platform.OS === "web") {
    window.open(url, "_blank");
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}
