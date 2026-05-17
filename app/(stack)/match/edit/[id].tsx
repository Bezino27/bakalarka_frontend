import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  ScrollView, // ✅ pridané
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";
import { BASE_URL } from "@/hooks/api";

export default function EditMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { fetchWithAuth } = useFetchWithAuth();
  const [isHome, setIsHome] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [opponent, setOpponent] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchMatch = async () => {
      try {
        const res = await fetchWithAuth(`${BASE_URL}/matches_edit/${id}/`);
        if (!res.ok) throw new Error("Nepodarilo sa načítať zápas");
        const data = await res.json();
        setOpponent(data.opponent || "");
        setLocation(data.location || "");
        setDescription(data.description || "");
        setVideoLink(data.video_link || "");
        setDate(new Date(data.date));
        setIsHome(data.is_home ?? false);
      } catch (err) {
        console.error(err);
        Alert.alert("Chyba", "Nepodarilo sa načítať údaje zápasu.");
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [fetchWithAuth, id]);

  const handleSave = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/matches_edit/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          opponent,
          location,
          description,
          date: date.toISOString(),
          video_link: videoLink,
          is_home: isHome,
        }),
      });

      if (!res.ok) throw new Error("Uloženie zlyhalo");

      Alert.alert("✅ Hotovo", "Zápas bol upravený.");
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert("Chyba", "Nepodarilo sa uložiť zmeny.");
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false} // 👀 voliteľne
    >
      <Text style={styles.label}>Súper</Text>
      <TextInput
        style={styles.input}
        value={opponent}
        onChangeText={setOpponent}
        placeholder="Zadaj súpera"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Miesto</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="Miesto zápasu"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Popis</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Popis zápasu"
        placeholderTextColor="#888"
        multiline
      />
      <View style={styles.switchRow}>
      <TouchableOpacity
        onPress={() => setIsHome(true)}
        style={[styles.switchButton, isHome && styles.switchButtonActive]}
      >
        <Text style={[styles.switchText, isHome && styles.switchTextActive]}>Doma</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsHome(false)}
        style={[styles.switchButton, !isHome && styles.switchButtonActive]}
      >
        <Text style={[styles.switchText, !isHome && styles.switchTextActive]}>Vonku</Text>
      </TouchableOpacity>
    </View>

      <Text style={styles.label}>Odkaz na video</Text>
      <TextInput
        style={styles.input}
        value={videoLink}
        onChangeText={setVideoLink}
        placeholder="https://youtube.com/..."
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={styles.label}>Dátum a čas</Text>

      {Platform.OS === "ios" ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 10,
            padding: 10,
            marginVertical: 10,
          }}
        >
          <DateTimePicker
            value={date}
            mode="datetime"
            display="spinner"
            themeVariant="light"
            textColor="#000"
            onChange={(_, selectedDate) => {
              if (selectedDate) setDate(selectedDate);
            }}
            style={{ height: 200 }}
          />
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.pickerButtonText}>
              📅 {date.toLocaleDateString("sk-SK")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.pickerButtonText}>
              ⏰{" "}
              {date.toLocaleTimeString("sk-SK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="calendar"
              onChange={(_, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  const newDate = new Date(date);
                  newDate.setFullYear(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth(),
                    selectedDate.getDate()
                  );
                  setDate(newDate);
                }
              }}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="clock"
              onChange={(_, selectedDate) => {
                setShowTimePicker(false);
                if (selectedDate) {
                  const newDate = new Date(date);
                  newDate.setHours(selectedDate.getHours());
                  newDate.setMinutes(selectedDate.getMinutes());
                  setDate(newDate);
                }
              }}
            />
          )}
        </>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>💾 Uložiť zmeny</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: "#fff",
  },
  label: {
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
    color: "#111",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    color: "#111",
    marginBottom: 10,
  },
  pickerButton: {
    backgroundColor: "#f4f4f4",
    padding: 12,
    marginVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  pickerButtonText: {
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#D32F2F",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  switchRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginVertical: 10,
},
switchButton: {
  flex: 1,
  alignItems: "center",
  paddingVertical: 10,
  marginHorizontal: 5,
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 8,
  backgroundColor: "#f9f9f9",
},
switchButtonActive: {
  backgroundColor: "#D32F2F",
  borderColor: "#D32F2F",
},
switchText: {
  fontWeight: "600",
  color: "#333",
},
switchTextActive: {
  color: "#fff",
},

});
