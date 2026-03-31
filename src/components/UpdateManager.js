import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import * as Updates from 'expo-updates';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const NATIVE_VERSION_URL = 'https://raw.githubusercontent.com/bvn1904/victus/main/version.json';

export default function UpdateManager() {
  useEffect(() => {
    checkUpdates();
  }, []);

  const checkUpdates = async () => {
    // 1. Check if user clicked "Later" within the last 24 hours
    try {
      const lastPromptStr = await SecureStore.getItemAsync('lastUpdatePrompt');
      if (lastPromptStr) {
        const lastPrompt = parseInt(lastPromptStr, 10);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (Date.now() - lastPrompt < twentyFourHours) {
          console.log("Update snoozed for 24h");
          return;
        }
      }
    } catch (e) {
      console.log("Snooze check failed:", e);
    }

    // --- CHECK A: Native Update (GitHub) ---
    try {
      const response = await fetch(NATIVE_VERSION_URL);
      if (response.ok) {
        const remoteData = await response.json();
        const currentVersion = Constants.expoConfig?.version || '1.0.0';
        
        if (compareVersions(remoteData.version, currentVersion) > 0) {
          showNativeUpdateAlert(remoteData.downloadUrl);
          return;
        }
      } else {
        console.log("GitHub version check skipped (404 or not found)");
      }
    } catch (e) {
      console.log("Native check failed (ignoring):", e);
    }

    // --- CHECK B: OTA Update (Expo) ---
    try {
      if (!__DEV__) { 
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          showOTAUpdateAlert();
        }
      }
    } catch (e) {
      console.log("OTA update check failed:", e);
    }
  };

  const showNativeUpdateAlert = (url) => {
    Alert.alert(
      "New App Version",
      "A new version of Victus is available. Please download the new APK.",
      [
        { text: "Later", onPress: () => snoozeUpdate(), style: "cancel" },
        { text: "Download", onPress: () => Linking.openURL(url) }
      ]
    );
  };

  const showOTAUpdateAlert = () => {
    Alert.alert(
      "Update Available",
      "A new update is available. Download now?",
      [
        { text: "Later", onPress: () => snoozeUpdate(), style: "cancel" },
        { 
          text: "OK", 
          onPress: async () => {
            try {
              await Updates.fetchUpdateAsync();
              Alert.alert(
                "Update Ready",
                "The app needs to restart to apply changes.",
                [
                  { 
                    text: "Relaunch", 
                    onPress: async () => {
                      await Updates.reloadAsync(); 
                    } 
                  }
                ]
              );
            } catch (e) {
              Alert.alert("Error", "Failed to download update.");
            }
          }
        }
      ]
    );
  };

  const snoozeUpdate = async () => {
    try {
      await SecureStore.setItemAsync('lastUpdatePrompt', Date.now().toString());
    } catch (e) {
      console.log("Snooze save failed:", e);
    }
  };

  const compareVersions = (v1, v2) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const val1 = parts1[i] || 0;
      const val2 = parts2[i] || 0;
      if (val1 > val2) return 1;
      if (val1 < val2) return -1;
    }
    return 0;
  };

  return null;
}
