import React, { useCallback, useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { useFetchWithAuth } from '@/hooks/fetchWithAuth';
import { BASE_URL } from '@/hooks/api';

type Training = {
  id: number;
  date: string;
  time: string;
  location: string;
  category: string;
  status: 'present' | 'absent' | 'unknown';
  players_present: number;
  players_total: number;
};

type CategoryStats = {
  category_id: number;
  category_name: string;
  present: number;
  absent: number;
  unknown: number;
  total: number;
  percentage: number;
};

type PlayerDetail = {
  player_id: number;
  name: string;
  number: number;
  birth_date: string | null;
  email: string | null;
  email_2: string | null;
  height: string | null;
  weight: string | null;
  side: string | null;
  position: string | null;
  categories: CategoryStats[];
  trainings: Training[];
  reason?: { reason: string; count: number }[];

};

const monthNames = [
  'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
  'Júl', 'August', 'September', 'Október', 'November', 'December'
];
const monthIndexes = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];

const getSeasonLabel = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 5 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

export default function PlayerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { fetchWithAuth } = useFetchWithAuth();
    const { isLoggedIn } = useContext(AuthContext);

    const [data, setData] = useState<PlayerDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
    const now = new Date();


    const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
    const [selectedSeason, setSelectedSeason] = useState<string>(getSeasonLabel(now));
    const [seasonPickerVisible, setSeasonPickerVisible] = useState(false);
    const [monthPickerVisible, setMonthPickerVisible] = useState(false);

    const router = useRouter();


  const loadData = useCallback(async () => {
    if (!isLoggedIn || !id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSeason) params.append('season', selectedSeason);
      if (selectedMonth !== -1) params.append('month', String(selectedMonth));

      const res = await fetchWithAuth(`${BASE_URL}/player-attendance/${id}/?${params.toString()}`);
      const json: PlayerDetail = await res.json();
      setData(json);
    } catch (e) {
      console.error('❌ Error loading player detail', e);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, id, isLoggedIn, selectedMonth, selectedSeason]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;
  if (!data) return <Text style={{ padding: 20 }}>Hráč neexistuje alebo nemáš oprávnenie.</Text>;

  // dostupné sezóny podľa tréningov
  const allSeasons = Array.from(new Set(data.trainings.map((t) => getSeasonLabel(new Date(t.date))))).sort().reverse();

  return (
    <ScrollView style={styles.container}>
      {/* Info hráča */}
      <Text style={styles.name}>
        {data.name} <Text style={styles.number}>#{data.number}</Text>
      </Text>
      <Text style={styles.position}>{data.position || 'Bez pozície'}</Text>

      <View style={styles.infoCard}>
        <InfoRow label="Dátum narodenia" value={data.birth_date} />
        <InfoRow label="Email" value={data.email} />
        <InfoRow label="Alternatívny email" value={data.email_2} />
        <InfoRow label="Výška" value={data.height} />
        <InfoRow label="Váha" value={data.weight} />
        <InfoRow label="Strana hokejky" value={data.side} />
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setSeasonPickerVisible(true)}>
          <Text style={styles.filterText}>Sezóna: {selectedSeason}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setMonthPickerVisible(true)}>
          <Text style={styles.filterText}>
            Mesiac: {selectedMonth === -1 ? 'Všetky' : monthNames[selectedMonth]}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pickery */}
      <Modal visible={seasonPickerVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {allSeasons.map((season) => (
              <TouchableOpacity
                key={season}
                onPress={() => {
                  setSelectedSeason(season);
                  setSeasonPickerVisible(false);
                }}
              >
                <Text style={styles.modalItem}>{season}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setSeasonPickerVisible(false)}>
              <Text style={styles.modalClose}>Zavrieť</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={monthPickerVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => {
                setSelectedMonth(-1);
                setMonthPickerVisible(false);
              }}
            >
              <Text style={styles.modalItem}>Všetky</Text>
            </TouchableOpacity>
            {monthIndexes.map((idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setSelectedMonth(idx);
                  setMonthPickerVisible(false);
                }}
              >
                <Text style={styles.modalItem}>{monthNames[idx]}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setMonthPickerVisible(false)}>
              <Text style={styles.modalClose}>Zavrieť</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Kategórie + tréningy */}
      {data.categories.map((cat) => {
        const isExpanded = expandedCategory === cat.category_id;
        return (
          <View key={cat.category_id} style={styles.block}>
            <TouchableOpacity
              onPress={() => setExpandedCategory(isExpanded ? null : cat.category_id)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={styles.catTitle}>{cat.category_name}</Text>
              <Text>{isExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            <Text style={styles.stat}>🟢 Prítomný: {cat.present}</Text>
            <Text style={styles.stat}>🔴 Neprítomný: {cat.absent}</Text>
            <Text style={styles.stat}>⚫ Neodpovedal: {cat.unknown}</Text>
            <View style={styles.progressBarWrap}>
              <View style={[styles.progressBarFill, { width: `${cat.percentage}%` }]} />
            </View>
            <Text style={styles.percentText}>
              {cat.percentage}% z {cat.total} tréningov
            </Text>

            {isExpanded &&
              data.trainings
                .filter((tr) => tr.category === cat.category_name)
                .map((tr) => {
                  const d = new Date(tr.date + 'T00:00:00');
                  const formattedDate = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
                  const days = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
                  const dayName = days[d.getDay()];

                  return (
                    <TouchableOpacity
                      key={tr.id}
                      style={styles.trainingCard}
                      onPress={() =>
                        router.push({ pathname: '/training/[id]', params: { id: String(tr.id) } })
                      }
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.trainingDate}>
                          {dayName} {formattedDate} {tr.time}
                        </Text>
                        <Text style={styles.trainingStatus}>
                          {tr.status === 'present' ? '✅' : tr.status === 'absent' ? '❌' : '⚫'}
                        </Text>
                      </View>
                      <Text style={styles.trainingLocation}>📍 {tr.location}</Text>
                      <Text style={styles.trainingPlayers}>
                        {tr.players_present}/{tr.players_total} hráčov
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                                {data.reason && data.reason.length > 0 && (
                  <View style={styles.absenceBlock}>
                    <Text style={styles.absenceTitle}>📋 Dôvody neúčasti</Text>
                    {data.reason.map((item, index) => (
                      <View key={index} style={styles.absenceRow}>
                        <Text style={styles.absenceReason}>{item.reason || 'Nezadané'}</Text>
                        <Text style={styles.absenceCount}>x{item.count}</Text>
                      </View>
                    ))}
                  </View>
                )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const InfoRow = ({ label, value }: { label: string; value: string | null }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '-'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  name: { fontSize: 26, fontWeight: 'bold', color: '#000' },
  number: { color: '#888', fontWeight: '600', fontSize: 20 },
  position: { fontSize: 16, color: '#D32F2F', marginBottom: 16 },
  infoCard: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 14, color: '#555', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#000', fontWeight: '600' },

  filterRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
  filterButton: { backgroundColor: '#eee', padding: 10, borderRadius: 8 },
  filterText: { fontWeight: '600', color: '#000' },

  block: { marginTop: 20, padding: 15, backgroundColor: '#f9f9f9', borderRadius: 10 },
  catTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#D32F2F' },
  stat: { fontSize: 14, color: '#333', marginBottom: 4 },
  progressBarWrap: { height: 10, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden', marginTop: 6 },
  progressBarFill: { height: '100%', backgroundColor: '#D32F2F' },
  percentText: { marginTop: 5, fontSize: 13, color: '#444' },

  trainingCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginTop: 10, elevation: 1 },
  trainingDate: { fontSize: 15, fontWeight: '600', color: '#000' },
  trainingStatus: { fontSize: 18 },
  trainingLocation: { fontSize: 14, color: '#555', marginTop: 2 },
  trainingPlayers: { fontSize: 13, color: '#777', marginTop: 2 },

  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContent: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 10 },
  modalItem: { fontSize: 18, paddingVertical: 8 },
  modalClose: { marginTop: 10, textAlign: 'center', color: '#D32F2F', fontWeight: '600' },
  absenceBlock: {
  marginTop: 30,
  padding: 15,
  backgroundColor: '#fff',
  borderRadius: 10,
  elevation: 2,
},
absenceTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#D32F2F',
  marginBottom: 10,
},
absenceRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 6,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},
absenceReason: {
  fontSize: 15,
  color: '#000',
  flexShrink: 1,
},
absenceCount: {
  fontSize: 15,
  fontWeight: 'bold',
  color: '#555',
},

});
