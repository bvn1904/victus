import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, BarChart2, User } from 'lucide-react-native';
import Toast, { BaseToast } from 'react-native-toast-message';

import { theme } from './src/theme';
import { initDB } from './src/database'; 
import UpdateManager from './src/components/UpdateManager';

import ProfileScreen from './src/screens/ProfileScreen';
import HomeScreen from './src/screens/HomeScreen';
import AnalysisScreen from './src/screens/AnalysisScreen'; 

const Tab = createBottomTabNavigator();

const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: theme.colors.success, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 12 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary }}
      text2Style={{ fontSize: 14, color: theme.colors.textSecondary }}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: theme.colors.error, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 12 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary }}
      text2Style={{ fontSize: 14, color: theme.colors.textSecondary }}
    />
  ),
};

export default function App() {
  
  useEffect(() => {
    initDB();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <UpdateManager />
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName="Home"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: { 
              backgroundColor: theme.colors.surface, 
              height: 70, 
              borderTopWidth: 0, 
              elevation: 0,
              paddingBottom: 10,
              paddingTop: 10
            },
            tabBarShowLabel: false,
            tabBarIcon: ({ focused }) => {
              const iconColor = focused ? theme.colors.primary : theme.colors.textSecondary;
              if (route.name === 'Profile') return <User color={iconColor} size={28} />;
              if (route.name === 'Home') return <Home color={iconColor} size={28} />;
              if (route.name === 'Analysis') return <BarChart2 color={iconColor} size={28} />;
            },
          })}
        >
          <Tab.Screen name="Profile" component={ProfileScreen} />
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Analysis" component={AnalysisScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      
      {/* Toast visibility set to 2.5 seconds */}
      <Toast config={toastConfig} visibilityTime={2500} /> 
    </SafeAreaProvider>
  );
}
