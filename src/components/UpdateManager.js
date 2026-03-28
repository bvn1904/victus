import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Linking, AppState } from 'react-native';
import * as Updates from 'expo-updates';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, Sparkles, RefreshCw } from 'lucide-react-native';
import { theme } from '../theme';

const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/bvn1904/victus/main/version.json';
const SNOOZE_KEY = 'lastUpdatePrompt';
const SNOOZE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default function UpdateManager() {
  const [modalVisible, setModalVisible] = useState(false);
  const [updateType, setUpdateType] = useState(null); // 'native' or 'ota'
  const [meta, setMeta] = useState({ version: '', notes: '', apkUrl: '' });
  const [status, setStatus] = useState('idle'); // idle, downloading, ready

  useEffect(() => {
    checkUpdates();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkUpdates();
      }
    });
    return () => subscription.remove();
  }, []);

  const checkUpdates = async () => {
    if (__DEV__) return;

    // 1. Check Snooze
    try {
      const lastPrompt = await SecureStore.getItemAsync(SNOOZE_KEY);
      if (lastPrompt && Date.now() - parseInt(lastPrompt) < SNOOZE_DURATION) {
        console.log('Update snoozed');
        return;
      }
    } catch (e) { console.log('Snooze check failed', e); }

    // 2. Check Native (GitHub) - Priority
    try {
      const response = await fetch(UPDATE_CHECK_URL);
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          const currentVersion = Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';
          
          if (data.version && compareVersions(data.version, currentVersion) > 0) {
            setUpdateType('native');
            setMeta({ 
              version: data.version, 
              notes: data.notes || 'Major update available.', 
              apkUrl: data.apkUrl || data.downloadUrl 
            });
            setModalVisible(true);
            return;
          }
        }
      }
    } catch (e) { console.log('Native check failed', e); }

    // 3. Check OTA (Expo)
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateType('ota');
        setMeta({ 
            version: 'New', 
            notes: 'Bug fixes and performance improvements.', 
            apkUrl: '' 
        });
        setModalVisible(true);
      }
    } catch (e) { console.log('OTA check failed', e); }
  };

  const handleAction = async () => {
    if (updateType === 'native') {
      if (meta.apkUrl) {
        Linking.openURL(meta.apkUrl);
        setModalVisible(false);
      }
    } else {
      // OTA Flow
      if (status === 'idle') {
        setStatus('downloading');
        try {
            await Updates.fetchUpdateAsync();
            setStatus('ready');
        } catch (e) {
            setStatus('idle');
            console.log("Download failed", e);
        }
      } else if (status === 'ready') {
        await Updates.reloadAsync();
      }
    }
  };

  const handleSnooze = async () => {
    await SecureStore.setItemAsync(SNOOZE_KEY, Date.now().toString());
    setModalVisible(false);
  };

  const compareVersions = (v1, v2) => {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
  };

  if (!modalVisible) return null;

  return (
    <Modal transparent animationType="fade" visible={modalVisible}>
      <View style={styles.overlay}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        
        <LinearGradient
            colors={[theme.colors.surfaceHighlight, theme.colors.surface]}
            style={styles.modalContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Sparkles color={theme.colors.primary} size={24} />
            </View>
            <View>
              <Text style={styles.title}>
                  {updateType === 'native' ? 'App Update' : 'Update Available'}
              </Text>
              <Text style={styles.versionText}>
                  {updateType === 'native' ? `v${meta.version} Ready` : 'Quick Update'}
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.sectionHeader}>What's New</Text>
            <Text style={styles.notes}>
                {status === 'ready' ? 'Update downloaded. Restart now to apply?' : meta.notes}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleSnooze}>
              <Text style={styles.cancelText}>Later</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.updateButton} 
                onPress={handleAction}
                disabled={status === 'downloading'}
            >
              <LinearGradient
                colors={[theme.colors.accent, '#0095CC']}
                start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                style={styles.gradientButton}
              >
                {status === 'downloading' ? (
                    <Text style={styles.updateText}>Downloading...</Text>
                ) : status === 'ready' ? (
                    <>
                        <RefreshCw color="#FFF" size={20} style={{marginRight: 8}} />
                        <Text style={styles.updateText}>Restart App</Text>
                    </>
                ) : (
                    <>
                        <Download color="#FFF" size={20} style={{marginRight: 8}} />
                        <Text style={styles.updateText}>
                            {updateType === 'native' ? 'Download APK' : 'Update Now'}
                        </Text>
                    </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContainer: { width: '85%', maxWidth: 340, borderRadius: 28, padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 24, elevation: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  iconContainer: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.glowCyan, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFF', letterSpacing: -0.3 },
  versionText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  content: { marginBottom: 28 },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.2 },
  notes: { fontSize: 15, color: '#E0E0E0', lineHeight: 24 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 },
  cancelButton: { paddingVertical: 14, paddingHorizontal: 18, marginRight: 8 },
  cancelText: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: '500' },
  updateButton: { borderRadius: 14, overflow: 'hidden' },
  gradientButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 22 },
  updateText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});
