import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { User, Ruler, Weight, Activity, ChevronRight, Download } from 'lucide-react-native';
import { theme } from '../theme';
import { exportAllData } from '../database'; // Import the new DB function

const activityLevels = [
  { id: '1.2', label: 'Sedentary', desc: 'Little or no exercise' },
  { id: '1.375', label: 'Light', desc: 'Exercise 1-3 days/week' },
  { id: '1.55', label: 'Moderate', desc: 'Exercise 3-5 days/week' },
  { id: '1.725', label: 'Active', desc: 'Exercise 6-7 days/week' },
  { id: '1.9', label: 'Very Active', desc: 'Hard exercise/physical job' },
];

export default function ProfileScreen() {
  const [age, setAge] = useState('22');
  const [weight, setWeight] = useState('74');
  const [height, setHeight] = useState('177.8');
  const [gender, setGender] = useState('male');
  const [activityMultiplier, setActivityMultiplier] = useState('1.2');
  const [profilePic, setProfilePic] = useState(null);
  const [results, setResults] = useState({ bmr: 0, maintenance: 0, bulk: 0, cut: 0 });
  const [isModalVisible, setModalVisible] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('@profile_data');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setAge(parsed.age); setWeight(parsed.weight); setHeight(parsed.height); setGender(parsed.gender); setActivityMultiplier(parsed.activityMultiplier);
        if (parsed.profilePic) setProfilePic(parsed.profilePic);
        calculateMacros(parsed);
      } else {
        calculateMacros({ age, weight, height, gender, activityMultiplier });
      }
    } catch (e) { console.error(e); }
  };

  const saveProfile = async (newPicUri = null) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const picToSave = newPicUri !== null ? newPicUri : profilePic;
    const data = { age, weight, height, gender, activityMultiplier, profilePic: picToSave };
    await AsyncStorage.setItem('@profile_data', JSON.stringify(data));
    calculateMacros(data);
    Toast.show({ type: 'success', text1: 'Stats Updated' });
  };

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
      saveProfile(result.assets[0].uri);
    }
  };

  const calculateMacros = (data) => {
    const w = parseFloat(data.weight); const h = parseFloat(data.height); const a = parseInt(data.age); const mult = parseFloat(data.activityMultiplier);
    if (!w || !h || !a) return;
    let bmr = data.gender === 'male' ? (10 * w) + (6.25 * h) - (5 * a) + 5 : (10 * w) + (6.25 * h) - (5 * a) - 161;
    const maintenance = bmr * mult;
    setResults({ bmr: Math.round(bmr), maintenance: Math.round(maintenance), cut: Math.round(maintenance * 0.90), bulk: Math.round(maintenance * 1.10) });
  };

  const currentActivityLabel = activityLevels.find(l => l.id === activityMultiplier)?.label || 'Select';

  // --- EXPORT LOGIC ---
  const handleExportData = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const data = exportAllData();
      if (!data) throw new Error("Could not fetch data");

      // Convert the database objects into a beautifully formatted JSON string
      const jsonString = JSON.stringify(data, null, 2);
      
      // Create a temporary file path on the device
      const fileUri = `${FileSystem.documentDirectory}victus_backup.json`;

      // Write the data to the file
      await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });

      // Open the native share menu
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Victus Data',
          UTI: 'public.json'
        });
        Toast.show({ type: 'success', text1: 'Data Exported' });
      } else {
        Toast.show({ type: 'error', text1: 'Sharing not available on this device' });
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Export Failed' });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <Text style={theme.typography.header}>My Profile</Text>
          <TouchableOpacity style={styles.avatarCircleSmall} onPress={pickImage}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.avatarImage} />
            ) : (
              <User color={theme.colors.background} size={28} />
            )}
          </TouchableOpacity>
        </View>

        <LinearGradient colors={[theme.colors.surface, theme.colors.background]} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={theme.typography.body}>Age</Text>
              <TextInput style={styles.inputPremium} value={age} onChangeText={setAge} keyboardType="numeric" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={theme.typography.body}>Gender</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, gender === 'male' && styles.toggleBtnActive]} onPress={() => { Haptics.selectionAsync(); setGender('male'); }}>
                  <Text style={[styles.toggleBtnText, gender === 'male' && styles.toggleBtnTextActive]}>M</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, gender === 'female' && styles.toggleBtnActive]} onPress={() => { Haptics.selectionAsync(); setGender('female'); }}>
                  <Text style={[styles.toggleBtnText, gender === 'female' && styles.toggleBtnTextActive]}>F</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={theme.typography.body}>Height (cm)</Text>
              <View style={styles.inputWithIcon}>
                <Ruler color={theme.colors.textSecondary} size={16} />
                <TextInput style={styles.inputTextBorderless} value={height} onChangeText={setHeight} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={theme.typography.body}>Weight (kg)</Text>
              <View style={styles.inputWithIcon}>
                <Weight color={theme.colors.textSecondary} size={16} />
                <TextInput style={styles.inputTextBorderless} value={weight} onChangeText={setWeight} keyboardType="numeric" />
              </View>
            </View>
          </View>

          <Text style={[theme.typography.body, { marginTop: 12 }]}>Exercise Level</Text>
          <TouchableOpacity style={styles.exerciseTrigger} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setModalVisible(true); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Activity color={theme.colors.primary} size={18} style={{ marginRight: 8 }} />
              <Text style={styles.exerciseTriggerText}>{currentActivityLabel}</Text>
            </View>
            <ChevronRight color={theme.colors.textSecondary} size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => saveProfile(null)}>
            <Text style={styles.buttonText}>Update Stats</Text>
          </TouchableOpacity>
        </LinearGradient>

        <LinearGradient colors={[theme.colors.surfaceHighlight, theme.colors.surface]} style={styles.card}>
          <Text style={theme.typography.subheader}>Daily Targets</Text>
          <View style={styles.targetRow}><Text style={styles.targetLabel}>BMR</Text><Text style={styles.targetValue}>{results.bmr} kcal</Text></View>
          <View style={styles.targetRow}><Text style={styles.targetLabel}>Maintenance</Text><Text style={styles.targetValue}>{results.maintenance} kcal</Text></View>
          <View style={styles.targetRow}><Text style={styles.targetLabel}>Loss (-10%)</Text><Text style={styles.targetValue}>{results.cut} kcal</Text></View>
          <View style={styles.targetRow}><Text style={styles.targetLabel}>Gain (+10%)</Text><Text style={styles.targetValue}>{results.bulk} kcal</Text></View>
        </LinearGradient>

        {/* Database Export Button */}
        <TouchableOpacity style={styles.exportButton} onPress={handleExportData}>
          <Download color={theme.colors.textSecondary} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.exportButtonText}>Export Data (JSON)</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.sheetContent}>
            <View style={styles.modalHandle} />
            <Text style={[theme.typography.subheader, { marginBottom: 16 }]}>Select Activity Level</Text>
            {activityLevels.map((level) => (
              <TouchableOpacity 
                key={level.id} 
                style={[styles.sheetItem, activityMultiplier === level.id && styles.sheetItemActive]} 
                onPress={() => { Haptics.selectionAsync(); setActivityMultiplier(level.id); setModalVisible(false); }}
              >
                <Text style={[styles.sheetItemTitle, activityMultiplier === level.id && { color: theme.colors.primary }]}>{level.label}</Text>
                <Text style={styles.sheetItemDesc}>{level.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 16 },
  avatarCircleSmall: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  
  card: { padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  inputGroup: { flex: 0.48 },
  inputPremium: { backgroundColor: theme.colors.surfaceHighlight, color: theme.colors.textPrimary, padding: 14, borderRadius: 12, marginTop: 6, fontSize: 16 },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 12, borderRadius: 12, marginTop: 6, height: 50 },
  inputTextBorderless: { flex: 1, color: theme.colors.textPrimary, marginLeft: 8, fontSize: 16 },
  toggleRow: { flexDirection: 'row', marginTop: 6, justifyContent: 'space-between' },
  toggleBtn: { flex: 0.48, backgroundColor: theme.colors.surfaceHighlight, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: theme.colors.primary },
  toggleBtnText: { color: theme.colors.textSecondary, fontWeight: '700' },
  toggleBtnTextActive: { color: theme.colors.background },
  exerciseTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surfaceHighlight, padding: 16, borderRadius: 12, marginTop: 6 },
  exerciseTriggerText: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '600' },
  button: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 16 },
  
  // Export Button Styles
  exportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 20 },
  exportButtonText: { color: theme.colors.textSecondary, fontWeight: '600', fontSize: 16 },

  targetRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.background },
  targetLabel: { color: theme.colors.textSecondary, fontSize: 14 },
  targetValue: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: theme.colors.surfaceHighlight, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: theme.colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sheetItemActive: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 12, borderBottomWidth: 0 },
  sheetItemTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '600' },
  sheetItemDesc: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }
});
