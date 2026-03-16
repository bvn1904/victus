# UpdateManager.js - Quick Reference Card

## 🎯 What Changed?

### 5 Key Improvements from Tempus

| # | Feature | Impact |
|---|---------|--------|
| 1 | 24h Snooze | No more nagging users |
| 2 | Separated checks | GitHub failure ≠ OTA failure |
| 3 | Ask before download | Respects user data/battery |
| 4 | Better errors | Clear, actionable messages |
| 5 | Proper restart | Cross-platform working code apply |

---

## 🔧 Key Code Patterns

### Snooze Check (Start of checkUpdates)
```javascript
const lastPromptStr = await SecureStore.getItemAsync('lastUpdatePrompt');
if (lastPromptStr && Date.now() - parseInt(lastPromptStr) < SNOOZE_DURATION) {
  return; // Exit early - user snoozed
}
```

### Separated Checks
```javascript
// Native check (own try/catch)
try { /* GitHub APK check */ } catch (e) { console.log('Native:', e); }

// OTA check (own try/catch - runs even if native failed)
try { /* Expo bundle check */ } catch (e) { console.log('OTA:', e); }
```

### Two-Step OTA
```javascript
// Step 1: Ask user before download
Alert.alert('Update Available', 'Download now?', [
  { text: 'Later', onPress: () => snoozeUpdate() },
  { text: 'OK', onPress: async () => {
    // Step 2: Download
    await Updates.fetchUpdateAsync();
    // Step 3: Ask to restart
    Alert.alert('Update Ready', 'Restart to apply?', [
      { text: 'Relaunch', onPress: async () => {
        // Step 4: Restart
        await Updates.reloadAsync();
      }}
    ])
  }}
])
```

---

## 📊 State Flow

```
INITIAL STATE:
modalVisible = false
updateType = 'native'
remoteVersion = ''

AFTER GITHUB CHECK (if update found):
modalVisible = true ✅
remoteVersion = '1.1.0' ✅
updateType = 'native' ✅

AFTER USER CLICKS "LATER":
SecureStore.lastUpdatePrompt = Date.now() ✅
modalVisible = false ✅
Next app: checks snooze, returns early ✅
```

---

## 🚨 Error Scenarios

### Scenario 1: GitHub Down
```
GitHub fetch fails
  → Catch error, log "Native check failed"
  → Continue to OTA check
  → OTA check may succeed ✅
```

### Scenario 2: OTA Download Fails
```
fetchUpdateAsync() fails
  → Catch error
  → Alert "Failed to download"
  → User can retry later
  → No state corruption
```

### Scenario 3: Restart Fails (Rare)
```
reloadAsync() fails (shouldn't happen)
  → User can manually force-close
  → App restarts normally
  → Update applies ✅
```

---

## ✅ Quick Testing

### Test 1: Snooze Works
```
1. Click "Later"
2. Force close app
3. Reopen → no update prompt ✓
4. Check SecureStore has timestamp ✓
```

### Test 2: GitHub Failure Doesn't Block OTA
```
1. Block GitHub (disconnect/DNS)
2. App checks OTA anyway ✓
3. If OTA available, prompts ✓
```

### Test 3: OTA Flow
```
1. Create EAS update
2. App prompts "Download?" ✓
3. User clicks OK → downloads ✓
4. Prompts "Restart?" ✓
5. User clicks Relaunch → app restarts ✓
6. Running new code ✓
```

### Test 4: UI Still Premium
```
1. Open native update modal ✓
2. BlurView background visible ✓
3. LinearGradient button colored ✓
4. Lucide icon displayed ✓
5. Animation smooth ✓
```

---

## 📱 User Experience Before → After

### Before ❌
```
[Open app]
  ↓
[Update prompt] → Always (no snooze)
  ↓
[OTA] Auto-downloads → No user control
  ↓
[Native] AlertDialog → Lower quality UI
  ↓
[Restart] BackHandler.exitApp() → Abrupt
```

### After ✅
```
[Open app]
  ↓
[Check snooze] → Skip if < 24h
  ↓
[GitHub APK] Own check → Beautiful Modal
  ├─ "Later" → Snooze 24h
  └─ "Download" → Open URL
  ↓
[OTA] Own check → Respects user
  ├─ "Later" → Snooze 24h
  └─ "OK" → Downloads → Asks to restart
  ↓
[Restart] Updates.reloadAsync() → Graceful
```

---

## 🎨 UI Components Preserved

✅ **BlurView** - Overlay blur effect
✅ **LinearGradient** - Button gradient
✅ **Lucide Icons** - Sparkles & Download icons
✅ **Modal** - Animated dialog
✅ **Theme Colors** - Brand consistency

---

## 🔑 Key Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `checkUpdates()` | Main entry point | void |
| `showOTAUpdatePrompt()` | OTA alert dialog | void |
| `snoozeUpdate()` | Set snooze timestamp | Promise |
| `handleLater()` | Snooze & close modal | void |
| `handleUpdate()` | Open APK download | void |
| `compareVersions()` | Semantic version compare | -1/0/1 |

---

## 📦 Dependencies

```javascript
import * as SecureStore from 'expo-secure-store'; // NEW: For snooze
import * as Updates from 'expo-updates';          // Existing
import Constants from 'expo-constants';            // Existing
import { BlurView } from 'expo-blur';             // Existing
import { LinearGradient } from 'expo-linear-gradient'; // Existing
```

---

## 🚀 Deploy Checklist

- [ ] Code merged to main
- [ ] No lint errors
- [ ] SecureStore installed
- [ ] EAS build succeeds
- [ ] Test native APK update
- [ ] Test OTA update
- [ ] Test snooze (24h)
- [ ] Test error scenarios
- [ ] UI looks good
- [ ] Performance acceptable

---

## 💡 Pro Tips

1. **Testing in Dev:**
   ```javascript
   // Uncomment in checkUpdates() to test UI
   setRemoteVersion('1.1.0');
   setReleaseNotes('Test update');
   setModalVisible(true);
   ```

2. **Checking Snooze:**
   ```bash
   # In dev tools:
   await SecureStore.getItemAsync('lastUpdatePrompt');
   ```

3. **Clearing Snooze:**
   ```bash
   # To test same update again:
   await SecureStore.deleteItemAsync('lastUpdatePrompt');
   ```

4. **Forcing OTA Check:**
   ```javascript
   // In console:
   import * as Updates from 'expo-updates';
   await Updates.checkForUpdateAsync();
   ```

---

## 📚 Related Docs

- `UPDATE_MANAGER_IMPROVEMENTS.md` - Full feature explanation
- `RELAUNCH_EXPLANATION.md` - Why restart is necessary
- `CHANGES_SUMMARY.md` - Line-by-line code changes
- `COMPARISON.md` - Before/after comparison
- `UPDATE_FLOW_DIAGRAM.md` - Visual flow diagrams

---

**TL;DR:** Updated UpdateManager to be smarter (snooze), more resilient (separated checks), more respectful (ask before download), better at reporting (clearer errors), and technically correct (proper restart). UI unchanged.
