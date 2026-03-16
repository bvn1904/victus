import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Linking, Platform, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, Sparkles } from 'lucide-react-native';
import { theme } from '../theme';

// Use raw GitHub URL for version check
const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/bvn1904/victus/main/version.json';

export default function UpdateManager() {
  const [modalVisible, setModalVisible] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [apkUrl, setApkUrl] = useState('');

  useEffect(() => {
    checkUpdates();
  }, []);

  const checkUpdates = async () => {
    if (__DEV__) {
      console.log('Skipping update check in DEV mode');
      // Uncomment to test UI in dev
      // setRemoteVersion('1.1.0');
      // setReleaseNotes('UI Overhaul and Critical Bug Fixes');
      // setModalVisible(true);
      return; 
    }

    try {
      // 1. Check for OTA Updates (Hot Code Push)
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Update Ready',
          'A new version has been downloaded. Restart to apply?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Restart', onPress: () => Updates.reloadAsync() }
          ]
        );
      }

      // 2. Check for APK Updates (Major Version Changes)
      const response = await fetch(UPDATE_CHECK_URL);
      const data = await response.json();
      const currentVersion = Constants.expoConfig?.version || '1.0.0';

      if (compareVersions(data.version, currentVersion) > 0) {
        setRemoteVersion(data.version);
        setReleaseNotes(data.notes || 'Performance improvements and bug fixes.');
        setApkUrl(data.apkUrl);
        setModalVisible(true);
      }

    } catch (e) {
      console.log('Update check failed:', e);
    }
  };

  const compareVersions = (v1, v2) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const n1 = parts1[i] || 0;
      const n2 = parts2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  };

  const handleUpdate = () => {
    if (apkUrl) {
      Linking.openURL(apkUrl);
      setModalVisible(false);
    }
  };

  if (!modalVisible) return null;

  return (
    <Modal transparent animationType="fade" visible={modalVisible}>
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={styles.modalWrapper}>
          <LinearGradient
            colors={[theme.colors.surfaceHighlight, theme.colors.surface]}
            style={styles.modalContainer}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Sparkles color={theme.colors.primary} size={24} />
              </View>
              <View>
                <Text style={styles.title}>Update Available</Text>
                <Text style={styles.versionText}>v{remoteVersion} is ready to install</Text>
              </View>
            </View>

            <View style={styles.content}>
              <Text style={styles.sectionHeader}>What's New</Text>
              <Text style={styles.notes}>{releaseNotes}</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Later</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={handleUpdate}
              >
                <LinearGradient
                  colors={['#4F46E5', '#2563EB']}
                  start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                  style={styles.gradientButton}
                >
                  <Download color="#FFF" size={20} style={{marginRight: 8}} />
                  <Text style={styles.updateText}>Download Update</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalWrapper: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  versionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  content: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  notes: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  updateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  updateText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
