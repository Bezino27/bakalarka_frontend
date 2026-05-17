import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";

type FormationPlayer = {
  id: number;
  player: number;
  player_name: string;
  position: string;
  attendance_status: "present" | "absent" | "unanswered";
};

type FormationLine = {
  id: number;
  number: number;
  players: FormationPlayer[];
};

type Formation = {
  id: number;
  name: string;
  lines: FormationLine[];
};

type AttendancePlayer = {
  id: number;
  name: string;
  position?: string;
  status: "present" | "absent" | "unanswered";
};

export default function FormationOverviewScreen() {
  const { trainingId, categoryId } = useLocalSearchParams<{ trainingId: string; categoryId: string }>();
  const { fetchWithAuth } = useFetchWithAuth();
  const router = useRouter();

  const [formations, setFormations] = useState<Formation[]>([]);
  const [attendance, setAttendance] = useState<AttendancePlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [formRes, attRes] = await Promise.all([
          fetchWithAuth(`${BASE_URL}/formations-with-attendance/${categoryId}/${trainingId}/`),
          fetchWithAuth(`${BASE_URL}/training-detail/${trainingId}/`),
        ]);

        const formData = await formRes.json();
        const attData = await attRes.json();
        setFormations(formData);

        // extrahujeme všetkých hráčov z detailu tréningu
        const allPlayers: AttendancePlayer[] = [
          ...(attData.players?.present || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            position: p.position || null,
            status: "present",
          })),
          ...(attData.players?.absent || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            position: p.position || null,
            status: "absent",
          })),
          ...(attData.players?.unknown || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            position: p.position || null,
            status: "unanswered",
          })),
        ];
        setAttendance(allPlayers);
      } catch (e) {
        console.error("❌ Chyba pri načítaní dát:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [trainingId, categoryId, fetchWithAuth]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.formationsButton}
        onPress={() => router.push(`../formations/${categoryId}`)}
      >
        <Text style={styles.manageButtonText}>🛠️ Upraviť formácie</Text>
      </TouchableOpacity>

      {formations.map((formation) => {
        const playersInFormation = new Set(
          formation.lines.flatMap((line) => line.players.map((p) => p.player))
        );

        // hráči ktorí:
        // - idú na tréning (present)
        // - nie sú v tejto formácii
        // - nie sú brankári ("G")
        const outsidePlayers = attendance.filter(
          (p) =>
            p.status === "present" &&
            !playersInFormation.has(p.id) &&
            !["G", "GK", "GOALKEEPER", "BRANKÁR", "BRANKAR"].includes(
            (p.position || "").toUpperCase().trim()
)        );

        return (
          <View key={formation.id} style={styles.card}>
            <Text style={styles.cardTitle}>{formation.name}</Text>

            {formation.lines.map((line) => (
              <View key={line.id} style={styles.lineBox}>
                <Text style={styles.lineTitle}>{line.number}. päťka</Text>
                {line.players.map((p) => {
                  const color =
                    p.attendance_status === "present"
                      ? styles.green
                      : p.attendance_status === "absent"
                      ? styles.red
                      : styles.gray;

                  return (
                    <Text key={p.id} style={[styles.playerText, color]}>
                      {p.position} — {p.player_name}
                    </Text>
                  );
                })}
              </View>
            ))}

            {/* 🟢 Hráči mimo tejto formácie (okrem brankárov) */}
            {outsidePlayers.length > 0 && (
              <View style={styles.outsideBox}>
                <Text style={[styles.lineTitle, { color: "#388E3C", marginBottom: 4 }]}>
                  🟢 Hráči mimo tejto formácie
                </Text>
                {outsidePlayers.map((p) => (
                  <Text key={p.id} style={[styles.playerText, styles.green]}>
                    {p.name}
                    {p.position ? ` - ${p.position}` : ""}
                  </Text>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#e0e0e0" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#D32F2F",
    marginBottom: 8,
  },
  lineBox: {
    marginTop: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 8,
  },
  lineTitle: { fontWeight: "bold", marginBottom: 6, color: "#333" },
  playerText: { fontSize: 15, marginLeft: 6 },
  green: { color: "#388E3C" },
  red: { color: "#a31010" },
  gray: { color: "#555" },
  formationsButton: {
    backgroundColor: "#388E3C",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  manageButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  outsideBox: {
    marginTop: 10,
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 10,
  },
});
