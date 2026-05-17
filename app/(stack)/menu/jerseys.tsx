import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";
import { COLORS } from "@/constants/Colors";

type Category = {
  id: number;
  name: string;
};

type JerseyData = {
  category: string;
  used_numbers: number[];
};

type NumberStatus = "free" | "used" | "duplicate";

const JERSEY_COLORS = {
  free: "#00C853", // jasná zelená = číslo nemá nikto
  used: "#FFD600", // jasná žltá = číslo má 1 človek
  duplicate: "#D50000", // jasná červená = číslo má viac ľudí
};

export default function NumbersScreen() {
  const { fetchWithAuth } = useFetchWithAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [data, setData] = useState<JerseyData[]>([]);
  const [allNumbers, setAllNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/categories-in-club/`);
      const json = await res.json();
      setCategories(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("Chyba pri načítaní kategórií:", err);
    }
  }, [fetchWithAuth]);

  const fetchNumbers = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/jersey-numbers/`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("Chyba pri načítaní čísel:", err);
    }
  }, [fetchWithAuth]);

  const fetchAllNumbers = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/jersey-numbers/?all=true`);
      const json = await res.json();
      setAllNumbers(Array.isArray(json.all) ? json.all : []);
    } catch (err) {
      console.error("Chyba pri načítaní všetkých čísel:", err);
    }
  }, [fetchWithAuth]);

  const loadData = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);

        await Promise.all([
          fetchCategories(),
          fetchNumbers(),
          fetchAllNumbers(),
        ]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchAllNumbers, fetchCategories, fetchNumbers]
  );

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
  };

  const selectedCategoryNumbers = useMemo(() => {
    if (!selectedCategory) return null;

    const categoryData = data.find((item) => item.category === selectedCategory);
    return categoryData?.used_numbers || [];
  }, [data, selectedCategory]);

  const visibleNumbersForStatus = useMemo(() => {
    if (selectedCategoryNumbers) {
      return selectedCategoryNumbers;
    }

    return allNumbers;
  }, [allNumbers, selectedCategoryNumbers]);

  const visibleNumberCounts = useMemo(() => {
    const counts: Record<number, number> = {};

    visibleNumbersForStatus.forEach((number) => {
      counts[number] = (counts[number] || 0) + 1;
    });

    return counts;
  }, [visibleNumbersForStatus]);

  const getNumberStatus = (num: number): NumberStatus => {
    const count = visibleNumberCounts[num] || 0;

    if (count === 0) return "free";
    if (count === 1) return "used";
    return "duplicate";
  };

  const getJerseyColor = (num: number) => {
    const status = getNumberStatus(num);
    return JERSEY_COLORS[status];
  };

  const getSubtitleText = () => {
    if (selectedCategory) {
      return "Farba dresu ukazuje obsadenosť čísla vo vybranej kategórii.";
    }

    return "Farba dresu ukazuje obsadenosť čísla v celom klube.";
  };

  const renderNumber = (num: number) => {
    const color = getJerseyColor(num);
    const status = getNumberStatus(num);

    return (
      <View key={num} style={styles.dresWrapper}>
        <Image
          source={require("@/assets/images/dres_final.png")}
          style={[
            styles.dresImage,
            {
              tintColor: color,
            },
          ]}
        />

        <Text
          style={[
            styles.dresNumber,
            status === "used" && styles.dresNumberYellow,
          ]}
        >
          {num}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Načítavam čísla dresov...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      <View style={styles.headerCard}>
        <View style={styles.headerIcon}>
          <Ionicons name="shirt-outline" size={26} color={COLORS.primary} />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Čísla dresov</Text>
          <Text style={styles.subtitle}>
            Pri objednávke dresov si vieš skontrolovať, kto už používa dané
            číslo a v akej kategórii.
          </Text>
        </View>
      </View>

      <View style={styles.legendCard}>
        <Text style={styles.legendTitle}>Legenda</Text>

        <LegendItem
          color={JERSEY_COLORS.free}
          label="Zelený dres – číslo nemá nikto"
        />

        <LegendItem
          color={JERSEY_COLORS.used}
          label="Žltý dres – číslo má 1 človek"
        />

        <LegendItem
          color={JERSEY_COLORS.duplicate}
          label="Červený dres – číslo má viac ľudí"
        />

        <Text style={styles.legendNote}>
          Farby sa menia podľa aktuálne vybranej kategórie. Pri možnosti
          „Všetky“ sa počíta celý klub.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterTag,
            selectedCategory === null && styles.filterTagActive,
          ]}
          onPress={() => setSelectedCategory(null)}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.filterText,
              selectedCategory === null && styles.filterTextActive,
            ]}
          >
            Všetky
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.filterTag,
              selectedCategory === cat.name && styles.filterTagActive,
            ]}
            onPress={() => setSelectedCategory(cat.name)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategory === cat.name && styles.filterTextActive,
              ]}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.categoryCard}>
        <Text style={styles.categoryTitle}>
          {selectedCategory || "Všetky čísla v klube"}
        </Text>

        <Text style={styles.categorySubtitle}>{getSubtitleText()}</Text>

        <View style={styles.grid}>
          {Array.from({ length: 99 }, (_, i) => i + 1).map(renderNumber)}
        </View>
      </View>
    </ScrollView>
  );
}

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  const isYellow = color === JERSEY_COLORS.used;

  return (
    <View style={styles.legendItem}>
      <View style={styles.legendDresWrapper}>
        <Image
          source={require("@/assets/images/dres_final.png")}
          style={[
            styles.legendDresImage,
            {
              tintColor: color,
            },
          ]}
        />
        <Text
          style={[
            styles.legendNumber,
            isYellow && styles.legendNumberYellow,
          ]}
        >
          12
        </Text>
      </View>

      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    paddingVertical: 18,
    paddingBottom: 34,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "700",
  },

  headerCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  headerTextWrap: {
    flex: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
    lineHeight: 19,
  },

  legendCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  legendTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  legendDresWrapper: {
    width: 34,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginRight: 10,
  },

  legendDresImage: {
    width: 34,
    height: 42,
    resizeMode: "contain",
    position: "absolute",
  },

  legendNumber: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
    zIndex: 1,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  legendNumberYellow: {
    color: "#111111",
    textShadowColor: "rgba(255,255,255,0.4)",
  },

  legendText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  legendNote: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
    lineHeight: 18,
  },

  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 15,
  },

  filterContent: {
    paddingRight: 16,
  },

  filterTag: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
  },

  filterTagActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  filterText: {
    fontWeight: "700",
    color: COLORS.textMuted,
  },

  filterTextActive: {
    color: COLORS.white,
  },

  categoryCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 12,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 3,
    color: COLORS.primary,
    textAlign: "center",
  },

  categorySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },

  dresWrapper: {
    width: 44,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  dresImage: {
    width: 44,
    height: 56,
    resizeMode: "contain",
    position: "absolute",
  },

  dresNumber: {
    fontWeight: "900",
    color: "#FFFFFF",
    fontSize: 13,
    zIndex: 1,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  dresNumberYellow: {
    color: "#111111",
    textShadowColor: "rgba(255,255,255,0.4)",
  },
});