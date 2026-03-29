import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { ChevronLeft, ChevronRight } from 'lucide-react-native'; // Added Minus
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics'; 
import Toast from 'react-native-toast-message';
import { theme } from '../theme';
import { getMealsByDate, addMealToDB, updateMealInDB, deleteMealFromDB, getHabits, addHabit, deleteHabit, toggleHabit, getCompletedHabitsByDate, getTopMeals, updateHabit } from '../database';

const ProgressRing = ({ size, strokeWidth, progress, color, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeProgress = isNaN(progress) || progress < 0 ? 0 : Math.min(progress, 1);
  const strokeDashoffset = circumference - safeProgress * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle stroke="rgba(255,255,255,0.05)" fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <Circle stroke={color} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
};

export default function HomeScreen() {
  const [selectedDateOffset, setSelectedDateOffset] = useState(0); 
  const [baseDateOffset, setBaseDateOffset] = useState(0); // For pagination
  const [meals, setMeals] = useState([]);
  
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [waterConfig, setWaterConfig] = useState({ goal: '8', volume: '250' });
  const [isWaterModalVisible, setWaterModalVisible] = useState(false);

  const [habits, setHabits] = useState([]);
  const [completedHabits, setCompletedHabits] = useState([]);
  const [isHabitModalVisible, setHabitModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [newHabitName, setNewHabitName] = useState('');

  const [isModalVisible, setModalVisible] = useState(false);
  const [editingMealId, setEditingMealId] = useState(null);
  const [mealForm, setMealForm] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });
  
  // -------------------------------------------------------------------------
  // TARGETS CONFIGURATION
  // -------------------------------------------------------------------------
  const [dynamicTargets, setDynamicTargets] = useState({ calories: 2500, protein: 150, carbs: 200, fats: 70 });
  
  // OPTION 1: DYNAMIC TARGETS (Uses your Profile Screen stats)
  const targets = dynamicTargets; 
  
  // OPTION 2: MANUAL OVERRIDE (Uncomment the line below to hardcode your own targets)
  // const targets = { calories: 2800, protein: 180, carbs: 250, fats: 80 };
  // -------------------------------------------------------------------------

  const getActiveDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDateOffset);
    return d.toISOString().split('T')[0]; 
  };

  const [topMeal, setTopMeal] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadProfileTargets();
      loadWaterConfig();
      loadTopMeal();
      // Ensure data refreshes when screen is focused (fixes "reopen needed" bug)
      loadDailyMeals();
      loadDailyHabits();
      loadDailyWater();
    }, [selectedDateOffset]) // Re-run when date changes
  );

  useEffect(() => {
    loadDailyMeals();
    loadDailyHabits();
    loadDailyWater();
    loadTopMeal();
  }, [selectedDateOffset]);

  const loadTopMeal = () => {
    const top = getTopMeals();
    if (top && top.length > 0) setTopMeal(top[0]);
  };

  const handleQuickAddMeal = () => {
    if (!topMeal) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = getActiveDateString();
    
    addMealToDB(topMeal.name, topMeal.calories, topMeal.protein, topMeal.carbs, topMeal.fats, dateStr, timeStr);
    Toast.show({ type: 'success', text1: 'Meal Logged', text2: `Added ${topMeal.name}` });
    loadDailyMeals();
  };

  const loadDailyWater = async () => {
    try {
      const key = `@water_glasses_${getActiveDateString()}`;
      const saved = await AsyncStorage.getItem(key);
      setWaterGlasses(saved ? parseInt(saved) : 0);
    } catch (e) { console.error(e); }
  };

  const updateWater = async (increment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = Math.max(0, waterGlasses + increment);
    setWaterGlasses(newValue);
    try {
      const key = `@water_glasses_${getActiveDateString()}`;
      await AsyncStorage.setItem(key, String(newValue));
    } catch (e) { console.error(e); }
  };

  const loadProfileTargets = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('@profile_data');
      if (savedProfile) {
        const data = JSON.parse(savedProfile);
        const w = parseFloat(data.weight) || 74; 
        const h = parseFloat(data.height) || 177.8; 
        const a = parseInt(data.age) || 22; 
        const mult = parseFloat(data.activityMultiplier) || 1.2;
        
        let bmr = data.gender === 'male' ? (10 * w) + (6.25 * h) - (5 * a) + 5 : (10 * w) + (6.25 * h) - (5 * a) - 161;
        const maintenance = Math.round(bmr * mult);
        const protein = Math.round(w * 2); 
        const fats = Math.round(w * 1);    
        const carbs = Math.round((maintenance - (protein * 4) - (fats * 9)) / 4); 

        setDynamicTargets({ calories: maintenance, protein, carbs, fats });
      }
    } catch (e) { console.error(e); }
  };

  const loadWaterConfig = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('@water_config');
      if (savedConfig) setWaterConfig(JSON.parse(savedConfig));
    } catch(e) { console.error(e); }
  };

  const saveWaterConfig = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem('@water_config', JSON.stringify(waterConfig));
    setWaterModalVisible(false);
    Toast.show({ type: 'success', text1: 'Settings Updated', text2: 'Water targets saved.' });
  };

  const loadDailyMeals = () => setMeals(getMealsByDate(getActiveDateString()));

  const handleOpenModal = (meal = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (meal) {
      setEditingMealId(meal.id);
      setMealForm({
        name: meal.name, calories: String(meal.calories), protein: String(meal.protein), carbs: String(meal.carbs), fats: String(meal.fats)
      });
    } else {
      setEditingMealId(null);
      setMealForm({ name: '', calories: '', protein: '', carbs: '', fats: '' });
    }
    setModalVisible(true);
  };

  const handleSaveMeal = () => {
    if (!mealForm.name || !mealForm.calories || !mealForm.protein || !mealForm.carbs || !mealForm.fats) {
        Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill all nutrition fields.' });
        return;
    }
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = getActiveDateString();
    
    if (editingMealId) {
      updateMealInDB(editingMealId, mealForm.name, parseInt(mealForm.calories)||0, parseInt(mealForm.protein)||0, parseInt(mealForm.carbs)||0, parseInt(mealForm.fats)||0);
      Toast.show({ type: 'success', text1: 'Meal Updated' });
    } else {
      addMealToDB(mealForm.name, parseInt(mealForm.calories)||0, parseInt(mealForm.protein)||0, parseInt(mealForm.carbs)||0, parseInt(mealForm.fats)||0, dateStr, timeStr);
      Toast.show({ type: 'success', text1: 'Meal Logged' });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
    loadDailyMeals(); 
  };

  const handleDeleteMeal = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    deleteMealFromDB(id);
    loadDailyMeals();
    Toast.show({ type: 'error', text1: 'Meal Deleted' });
  };

  const loadDailyHabits = () => {
    setHabits(getHabits());
    setCompletedHabits(getCompletedHabitsByDate(getActiveDateString()));
  };

  const handleToggleHabit = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isNowCompleted = !completedHabits.includes(id);
    toggleHabit(id, getActiveDateString(), isNowCompleted);
    loadDailyHabits();
  };

  const handleSaveHabit = () => {
    if(!newHabitName) return;
    
    if (editingHabit) {
      updateHabit(editingHabit.id, newHabitName);
      Toast.show({ type: 'success', text1: 'Habit Updated' });
    } else {
      addHabit(newHabitName);
      Toast.show({ type: 'success', text1: 'Habit Added' });
    }

    setNewHabitName('');
    setEditingHabit(null);
    setHabitModalVisible(false);
    loadDailyHabits();
  };

  const handleOpenHabitModal = (habit = null) => {
    if (habit) {
      setEditingHabit(habit);
      setNewHabitName(habit.name);
    } else {
      setEditingHabit(null);
      setNewHabitName('');
    }
    setHabitModalVisible(true);
  };

  const handleDeleteHabit = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteHabit(id);
    loadDailyHabits();
  };

  const consumed = meals.reduce((acc, meal) => {
    acc.calories += meal.calories; acc.protein += meal.protein; acc.carbs += meal.carbs; acc.fats += meal.fats;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const isOverCalories = consumed.calories > targets.calories;
  const parsedWaterGoal = parseInt(waterConfig.goal) || 8;

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    // Generate 3 days based on baseDateOffset
    for (let i = -1; i <= 1; i++) {
      const offset = baseDateOffset + i;
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      let dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      if (offset === 0) dayName = 'Today';
      
      dates.push({ 
        offset: offset, 
        dayName: dayName, 
        dayNumber: d.getDate().toString().padStart(2, '0') 
      });
    }
    return dates;
  };
  const dates = generateDates();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.datePickerRow}>
          <TouchableOpacity onPress={() => {
             Haptics.selectionAsync();
             const newOffset = baseDateOffset - 3;
             setBaseDateOffset(newOffset);
             setSelectedDateOffset(newOffset); // Jump to the middle day of new set
          }} style={styles.navArrow}>
            <ChevronLeft color={theme.colors.textSecondary} size={24} />
          </TouchableOpacity>

          {dates.map((item) => (
            <TouchableOpacity 
              key={item.offset} 
              style={[styles.dateItem, selectedDateOffset === item.offset && styles.dateItemActive]} 
              onPress={() => { 
                Haptics.selectionAsync(); 
                setSelectedDateOffset(item.offset); 
              }}
            >
              <Text style={[styles.dateDayName, selectedDateOffset === item.offset && styles.dateTextActive]}>{item.dayName}</Text>
              <Text style={[styles.dateDayNumber, selectedDateOffset === item.offset && styles.dateTextActive]}>{item.dayNumber}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={() => {
             Haptics.selectionAsync();
             const newOffset = baseDateOffset + 3;
             setBaseDateOffset(newOffset);
             setSelectedDateOffset(newOffset);
          }} style={styles.navArrow}>
            <ChevronRight color={theme.colors.textSecondary} size={24} />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={[theme.colors.surfaceHighlight, theme.colors.surface]} style={[styles.card, styles.calorieCard]}>
          <View>
            <Text style={[styles.hugeNumber, isOverCalories && { color: theme.colors.error }]}>{Math.abs(targets.calories - consumed.calories)}</Text>
            <Text style={[theme.typography.body, isOverCalories && { color: theme.colors.error }]}>{isOverCalories ? 'Calories over' : 'Calories left'}</Text>
          </View>
          <ProgressRing size={90} strokeWidth={10} progress={consumed.calories / targets.calories} color={isOverCalories ? theme.colors.error : theme.colors.primary}>
             <Text style={[styles.ringTextSmall, isOverCalories && { color: theme.colors.error }]}>{consumed.calories}</Text>
             <Text style={styles.ringTextTiny}>/ {targets.calories}</Text>
          </ProgressRing>
        </LinearGradient>

        <View style={styles.macrosRow}>
          <LinearGradient colors={[theme.colors.surface, theme.colors.background]} style={styles.macroCard}>
            <Text style={styles.macroLabel}>Protein</Text>
            <ProgressRing size={70} strokeWidth={6} progress={consumed.protein / targets.protein} color={theme.colors.protein}>
               <Text style={styles.ringTextMedium}>{consumed.protein}</Text><Text style={styles.ringTextTiny}>/ {targets.protein}g</Text>
            </ProgressRing>
          </LinearGradient>
          <LinearGradient colors={[theme.colors.surface, theme.colors.background]} style={styles.macroCard}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <ProgressRing size={70} strokeWidth={6} progress={consumed.carbs / targets.carbs} color={theme.colors.carbs}>
               <Text style={styles.ringTextMedium}>{consumed.carbs}</Text><Text style={styles.ringTextTiny}>/ {targets.carbs}g</Text>
            </ProgressRing>
          </LinearGradient>
          <LinearGradient colors={[theme.colors.surface, theme.colors.background]} style={styles.macroCard}>
            <Text style={styles.macroLabel}>Fats</Text>
            <ProgressRing size={70} strokeWidth={6} progress={consumed.fats / targets.fats} color={theme.colors.fats}>
               <Text style={styles.ringTextMedium}>{consumed.fats}</Text><Text style={styles.ringTextTiny}>/ {targets.fats}g</Text>
            </ProgressRing>
          </LinearGradient>
        </View>

        {/* Updated Water UI with Minus and Plus */}
        <LinearGradient colors={[theme.colors.surfaceHighlight, theme.colors.surface]} style={styles.card}>
          <View style={styles.waterTopRow}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={styles.sectionTitle}>Water</Text>
              <TouchableOpacity onPress={() => setWaterModalVisible(true)} style={{marginLeft: 8, padding: 4}}>
                <Settings color={theme.colors.textSecondary} size={16} />
              </TouchableOpacity>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TouchableOpacity 
                style={[styles.blackAddBtn, { marginRight: 8 }]} 
                onPress={() => updateWater(-1)}
              >
                <Minus color={theme.colors.primary} size={18} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.blackAddBtn} 
                onPress={() => updateWater(1)}
              >
                <Plus color={theme.colors.primary} size={18} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.waterBarContainerTall}>
            <View style={[styles.waterBarFillTall, { width: `${Math.min((waterGlasses / parsedWaterGoal) * 100, 100)}%` }]} />
            <View style={styles.waterBarTextWrapper}>
              <Text style={styles.waterBarInsideText}>{waterGlasses} out of {parsedWaterGoal} glasses</Text>
            </View>
          </View>
          <Text style={styles.waterDetailsText}>
             1 glass = {waterConfig.volume}ml (Goal: {parsedWaterGoal * (parseInt(waterConfig.volume) || 250)}ml)
          </Text>
        </LinearGradient>

        <View style={styles.mealsHeaderRow}>
          <Text style={styles.sectionTitle}>Daily Checklist</Text>
          <TouchableOpacity style={styles.blackAddBtn} onPress={() => handleOpenHabitModal(null)}>
            <Plus color={theme.colors.primary} size={18} />
          </TouchableOpacity>
        </View>
        
        {habits.map(habit => {
          const isDone = completedHabits.includes(habit.id);
          return (
            <View key={habit.id} style={styles.habitItem}>
              <TouchableOpacity style={styles.habitLeft} onPress={() => handleToggleHabit(habit.id)}>
                {isDone ? <CheckSquare color={theme.colors.primary} size={24} /> : <Square color={theme.colors.textSecondary} size={24} />}
                <Text style={[styles.habitText, isDone && {textDecorationLine: 'line-through', color: theme.colors.textSecondary}]}>{habit.name}</Text>
              </TouchableOpacity>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <TouchableOpacity onPress={() => handleOpenHabitModal(habit)} style={{ marginRight: 12 }}>
                    <Edit2 color={theme.colors.textSecondary} size={18} />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => handleDeleteHabit(habit.id)}>
                    <X color={theme.colors.textSecondary} size={20} />
                 </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={[styles.mealsHeaderRow, {marginTop: 20}]}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.sectionTitle}>Meals</Text>
            {topMeal && (
              <TouchableOpacity style={styles.quickAddBtn} onPress={handleQuickAddMeal}>
                <Text style={styles.quickAddText}>+ {topMeal.name}</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.blackAddBtn} onPress={() => handleOpenModal(null)}>
            <Plus color={theme.colors.primary} size={18} />
          </TouchableOpacity>
        </View>

        {meals.length === 0 ? (
          <Text style={styles.emptyMealsText}>No meals logged today. Tap + to add.</Text>
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={styles.loggedMealItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.loggedMealName}>{meal.name}</Text>
                <Text style={styles.loggedMealTime}>{meal.time} • P:{meal.protein} C:{meal.carbs} F:{meal.fats}</Text>
              </View>
              <Text style={styles.loggedMealCals}>{meal.calories} kcal</Text>
              <View style={{ flexDirection: 'row', marginLeft: 12 }}>
                <TouchableOpacity onPress={() => handleOpenModal(meal)} style={{ marginRight: 12 }}><Edit2 color={theme.colors.textSecondary} size={20} /></TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteMeal(meal.id)}><Trash2 color={theme.colors.error} size={20} /></TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modals */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <Pressable style={styles.sheetContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.sheetTitle}>{editingMealId ? 'Edit Meal' : 'Log a Meal'}</Text>
              <TextInput style={styles.inputPremium} placeholderTextColor={theme.colors.textSecondary} placeholder="Meal Name (e.g., Whey Protein)" value={mealForm.name} onChangeText={(text) => setMealForm({...mealForm, name: text})} />
              <TextInput style={styles.inputPremium} placeholderTextColor={theme.colors.textSecondary} placeholder="Total Calories" keyboardType="numeric" value={mealForm.calories} onChangeText={(text) => setMealForm({...mealForm, calories: text})} />
              <View style={styles.inputRow}>
                <TextInput style={styles.inputPremiumThird} placeholderTextColor={theme.colors.textSecondary} placeholder="Protein (g)" keyboardType="numeric" value={mealForm.protein} onChangeText={(text) => setMealForm({...mealForm, protein: text})} />
                <TextInput style={styles.inputPremiumThird} placeholderTextColor={theme.colors.textSecondary} placeholder="Carbs (g)" keyboardType="numeric" value={mealForm.carbs} onChangeText={(text) => setMealForm({...mealForm, carbs: text})} />
                <TextInput style={styles.inputPremiumThird} placeholderTextColor={theme.colors.textSecondary} placeholder="Fats (g)" keyboardType="numeric" value={mealForm.fats} onChangeText={(text) => setMealForm({...mealForm, fats: text})} />
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveMeal}><Text style={styles.saveButtonText}>{editingMealId ? 'Update Meal' : 'Save Meal'}</Text></TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isWaterModalVisible} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={styles.modalOverlay} onPress={() => setWaterModalVisible(false)}>
            <Pressable style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>Water Targets</Text>
              <Text style={theme.typography.body}>Daily Goal (Glasses)</Text>
              <TextInput style={styles.inputPremium} keyboardType="numeric" value={waterConfig.goal} onChangeText={(text) => setWaterConfig({...waterConfig, goal: text})} />
              <Text style={theme.typography.body}>Volume per Glass (ml)</Text>
              <TextInput style={styles.inputPremium} keyboardType="numeric" value={waterConfig.volume} onChangeText={(text) => setWaterConfig({...waterConfig, volume: text})} />
              <TouchableOpacity style={styles.saveButton} onPress={saveWaterConfig}><Text style={styles.saveButtonText}>Save Targets</Text></TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isHabitModalVisible} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={styles.modalOverlay} onPress={() => setHabitModalVisible(false)}>
            <Pressable style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>{editingHabit ? 'Edit Habit' : 'New Daily Habit'}</Text>
              <TextInput style={styles.inputPremium} placeholderTextColor={theme.colors.textSecondary} placeholder="e.g., Creatine 5g" value={newHabitName} onChangeText={setNewHabitName} />
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveHabit}><Text style={styles.saveButtonText}>{editingHabit ? 'Update Habit' : 'Add Habit'}</Text></TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background }, container: { flex: 1 }, scrollContent: { padding: 16, paddingBottom: 100 },
  datePickerRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  dateItem: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 24 },
  dateItemActive: { backgroundColor: theme.colors.surfaceHighlight },
  dateDayName: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 }, dateDayNumber: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700' }, dateTextActive: { color: theme.colors.primary },
  card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border }, calorieCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, hugeNumber: { fontSize: 40, fontWeight: '800', color: theme.colors.textPrimary },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, macroCard: { borderRadius: 16, padding: 14, alignItems: 'center', width: '31%', borderWidth: 1, borderColor: theme.colors.border }, macroLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 10 },
  ringTextSmall: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700' }, ringTextMedium: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' }, ringTextTiny: { color: theme.colors.textSecondary, fontSize: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary }, 
  
  // Standardized Black Add Buttons
  blackAddBtn: { backgroundColor: theme.colors.background, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' },
  
  // Embedded Text Water UI
  waterTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  waterBarContainerTall: { height: 28, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, overflow: 'hidden', justifyContent: 'center' },
  waterBarFillTall: { height: '100%', backgroundColor: theme.colors.water, borderRadius: 14, position: 'absolute', top: 0, left: 0 },
  waterBarTextWrapper: { position: 'absolute', width: '100%', alignItems: 'center' },
  waterBarInsideText: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  waterDetailsText: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 10, textAlign: 'center' },

  // Alignment Fix: paddingRight 16 perfectly aligns with the inner padding of the Water card above it
  mealsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 12, paddingLeft: 4, paddingRight: 16 }, 
  emptyMealsText: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 10, fontStyle: 'italic' }, 
  loggedMealItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border }, loggedMealName: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '600' }, loggedMealTime: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }, loggedMealCals: { color: theme.colors.primary, fontSize: 16, fontWeight: '700' },
  
  habitItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  habitLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 }, habitText: { color: theme.colors.textPrimary, fontSize: 16, marginLeft: 12, fontWeight: '500' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: theme.colors.surface, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: theme.colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 20 },
  inputPremium: { backgroundColor: theme.colors.surfaceHighlight, color: theme.colors.textPrimary, padding: 16, borderRadius: 16, marginBottom: 12, fontSize: 16 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  inputPremiumThird: { backgroundColor: theme.colors.surfaceHighlight, color: theme.colors.textPrimary, padding: 16, borderRadius: 16, width: '31%', fontSize: 14, textAlign: 'center' },
  saveButton: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 16 },
});
