import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame } from 'lucide-react-native';
import { theme } from '../theme';
import { getMealsByDate } from '../database';

export default function AnalysisScreen() {
  const [weeklyData, setWeeklyData] = useState([]);
  const [averages, setAverages] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [maxCalories, setMaxCalories] = useState(1); 

  useFocusEffect(
    useCallback(() => {
      loadWeeklyData();
    }, [])
  );

  const loadWeeklyData = () => {
    const data = [];
    let totalCals = 0, totalPro = 0, totalCarbs = 0, totalFats = 0;
    let highestCal = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayMeals = getMealsByDate(dateStr);
      
      const dayMacros = dayMeals.reduce((acc, meal) => {
        acc.calories += meal.calories; acc.protein += meal.protein; acc.carbs += meal.carbs; acc.fats += meal.fats;
        return acc;
      }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

      if (dayMacros.calories > highestCal) highestCal = dayMacros.calories;

      totalCals += dayMacros.calories; totalPro += dayMacros.protein; totalCarbs += dayMacros.carbs; totalFats += dayMacros.fats;

      data.push({ id: dateStr, dayName, ...dayMacros });
    }

    setMaxCalories(highestCal > 0 ? highestCal : 2500); 
    setWeeklyData(data);
    setAverages({
      calories: Math.round(totalCals / 7), protein: Math.round(totalPro / 7), carbs: Math.round(totalCarbs / 7), fats: Math.round(totalFats / 7),
    });
  };

  const avgLinePosition = maxCalories > 0 ? Math.min((averages.calories / maxCalories) * 100, 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.headerContainerRow}>
          <Text style={theme.typography.header}>Weekly Insights</Text>
          <Text style={styles.headerSubtitleRight}>Last 7 Days</Text>
        </View>

        <LinearGradient colors={[theme.colors.surface, theme.colors.background]} style={styles.card}>
          <View style={styles.chartHeader}>
            <Flame color={theme.colors.primary} size={20} />
            <Text style={styles.chartTitle}>Calorie Intake</Text>
          </View>
          
          <View style={styles.chartContainer}>
            {averages.calories > 0 && (
              <View style={[styles.avgLine, { bottom: `${avgLinePosition}%` }]}>
                <View style={styles.avgLineBar} />
                <Text style={styles.avgLineText}>avg {averages.calories}</Text>
              </View>
            )}
            
            {weeklyData.map((day) => {
              const fillPercentage = Math.min((day.calories / maxCalories) * 100, 100);
              return (
                <View key={day.id} style={styles.barColumn}>
                  <Text style={styles.barValueText}>{day.calories > 0 ? day.calories : ''}</Text>
                  <View style={styles.barTrack}>
                    <LinearGradient colors={[theme.colors.primary, theme.colors.surface]} style={[styles.barFill, { height: `${fillPercentage}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{day.dayName}</Text>
                </View>
              );
            })}
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>7-Day Averages</Text>
        
        <View style={styles.averagesGrid}>
          <View style={styles.avgCard}><Text style={styles.avgValue}>{averages.calories}</Text><Text style={styles.avgLabel}>kcal</Text></View>
          <View style={styles.avgCard}><Text style={[styles.avgValue, { color: theme.colors.protein }]}>{averages.protein}g</Text><Text style={styles.avgLabel}>Protein</Text></View>
          <View style={styles.avgCard}><Text style={[styles.avgValue, { color: theme.colors.carbs }]}>{averages.carbs}g</Text><Text style={styles.avgLabel}>Carbs</Text></View>
          <View style={styles.avgCard}><Text style={[styles.avgValue, { color: theme.colors.fats }]}>{averages.fats}g</Text><Text style={styles.avgLabel}>Fats</Text></View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background }, 
  container: { flex: 1, padding: 16 },
  
  headerContainerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, marginTop: 10 },
  headerSubtitleRight: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '500', marginBottom: 4 },
  
  card: { borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: theme.colors.border },
  chartHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 }, 
  chartTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', marginLeft: 8 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, paddingTop: 20, position: 'relative' },
  barColumn: { alignItems: 'center', width: 36 }, 
  barTrack: { width: 14, height: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden', marginVertical: 8 }, 
  barFill: { width: '100%', borderRadius: 8 },
  barLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '500' }, 
  barValueText: { color: theme.colors.textPrimary, fontSize: 10, fontWeight: '600', height: 14 },
  
  avgLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  avgLineBar: { flex: 1, height: 1, backgroundColor: theme.colors.primary, opacity: 0.5 },
  avgLineText: { color: theme.colors.primary, fontSize: 9, fontWeight: '600', marginLeft: 4, opacity: 0.8 },
  
  // INCREASED GAP HERE (marginTop)
  sectionTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 32, marginBottom: 16 },
  
  averagesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }, 
  avgCard: { width: '48%', backgroundColor: theme.colors.surface, padding: 20, borderRadius: 16, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border }, 
  avgValue: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 4 }, 
  avgLabel: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' }
});
