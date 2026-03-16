# UpdateManager.js - Improvements from Tempus

## Overview
The updated `UpdateManager.js` incorporates key improvements from the Tempus implementation while maintaining Victus's premium BlurView/Modal UI design.

---

## Key Improvements Implemented

### 1. **Snooze Functionality (24 Hours)**
**Problem:** Users were prompted repeatedly for updates they weren't ready to install.

**Solution:** Added SecureStore-based snooze mechanism:
```javascript
const SNOOZE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Check on app startup
const lastPromptStr = await SecureStore.getItemAsync('lastUpdatePrompt');
if (lastPromptStr) {
  const lastPrompt = parseInt(lastPromptStr, 10);
  if (Date.now() - lastPrompt < SNOOZE_DURATION) {
    console.log('Update snoozed for 24h');
    return; // Skip all checks
  }
}

// When user clicks "Later"
const snoozeUpdate = async () => {
  await SecureStore.setItemAsync('lastUpdatePrompt', Date.now().toString());
};
```

**Benefit:** Users can defer updates without being nagged every app restart.

---

### 2. **Separation of Native vs OTA Checks**
**Problem:** If GitHub check failed, the entire update flow broke.

**Solution:** Each check has its own isolated try/catch block:
```javascript
// --- CHECK A: Native Update (GitHub APK) ---
try {
  const response = await fetch(UPDATE_CHECK_URL);
  if (response.ok) {
    // ... native update logic
  }
} catch (e) {
  console.log('Native check failed (ignoring):', e);
  // Doesn't block OTA check
}

// --- CHECK B: OTA Update (Expo) ---
try {
  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    showOTAUpdatePrompt();
  }
} catch (e) {
  console.log('OTA update check failed:', e);
}
```

**Benefit:** One failure doesn't cascade to destroy other update mechanisms.

---

### 3. **Immediate Prompt Behavior for OTA**
**Problem:** Old code called `fetchUpdateAsync()` immediately without asking user first.

**Solution:** Check first, then ask user:
```javascript
// BEFORE (wrong flow)
const update = await Updates.checkForUpdateAsync();
if (update.isAvailable) {
  await Updates.fetchUpdateAsync(); // ❌ Download without asking!
}

// AFTER (correct flow)
const update = await Updates.checkForUpdateAsync();
if (update.isAvailable) {
  showOTAUpdatePrompt(); // Ask user first
  // User can choose "Later" to snooze
  // If "OK" → then download
}
```

**Benefit:** Respects user's data/battery by asking before downloading.

---

### 4. **Better Error Handling**
**Problem:** Unclear error messages, poor recovery paths.

**Solution:** Specific, actionable error handling:
```javascript
const showOTAUpdatePrompt = () => {
  Alert.alert(
    'Update Available',
    'A new version is available. Download now?',
    [
      { text: 'Later', onPress: () => snoozeUpdate(), style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          try {
            await Updates.fetchUpdateAsync();
            // Download successful → prompt for restart
            Alert.alert(
              'Update Ready',
              'The app needs to restart to apply the update.',
              [
                {
                  text: 'Relaunch',
                  onPress: async () => {
                    await Updates.reloadAsync();
                  },
                },
              ]
            );
          } catch (e) {
            console.log('OTA update download failed:', e);
            Alert.alert(
              'Error',
              'Failed to download update. Please try again later.'
            );
          }
        },
      },
    ]
  );
};
```

**Benefit:** Clear feedback at each step; graceful recovery on failure.

---

### 5. **Correct OTA Restart Flow**
**Before → After:**

| Step | Before | After |
|------|--------|-------|
| 1 | User says "OK" | User says "OK" |
| 2 | ❌ Immediate download | ✅ Check for available update first |
| 3 | ❌ No confirmation | ✅ Prompt "Download now?" |
| 4 | — | Download in background |
| 5 | — | ✅ Confirm "Restart needed" |
| 6 | ❌ `BackHandler.exitApp()` (bad UX) | ✅ `Updates.reloadAsync()` (proper Expo way) |

---

## Answer: "Why is relaunch ALWAYS required?"

### The Technical Reason

OTA (Over-The-Air) updates work at the **JavaScript bundle level**:

1. **Download Phase:** The new bundle is fetched and stored on disk
2. **Load Phase:** App starts → Runtime loads the bundle into memory
3. **Code Execution:** VM executes the in-memory bundle

**Without a restart, the old bundle remains in memory.** Your app would have:
- ✅ New bundle on disk
- ❌ Old bundle in memory
- ❌ **No visible changes**

### Analogy
Think of it like updating a running server:
```javascript
// Your app is this loop:
while (appRunning) {
  executeCode(codeInMemory); // Currently running v1.0.0
}

// OTA download happens:
downloadNewBundle(); // New v1.1.0 written to disk
// But codeInMemory still = v1.0.0!

// You need to reload:
codeInMemory = loadBundleFromDisk(); // Now v1.1.0
// THEN the while loop executes v1.1.0
```

### Why Not Other Methods?

**❌ `BackHandler.exitApp()`**
- Android: Works but kills app abruptly (poor UX)
- iOS: Doesn't actually kill the app (Apple policy)
- Result: Unpredictable behavior across platforms

**❌ Wait for user to manually restart**
- App sits with stale bundle indefinitely
- Critical bug fixes never apply
- Security patches don't protect user

**✅ `Updates.reloadAsync()`**
- Proper Expo SDK method
- Gracefully stops JS execution
- Loads new bundle from disk
- Restarts React Native runtime with new code
- Cross-platform compatible

---

## Premium UI Preserved

The improvements are integrated while keeping the **beautiful Victus design**:

✅ BlurView overlay
✅ LinearGradient buttons
✅ Lucide icons
✅ Modal animations
✅ Theme integration

**Code flow for Native Updates (via Modal):**
```
GitHub version check
  ↓
New version available?
  ↓
Show Premium Modal UI
  ↓
User chooses: "Later" (snooze) or "Download" (open APK)
```

**Code flow for OTA Updates (via Alert):**
```
Expo OTA check
  ↓
New update available?
  ↓
Show Alert: "Download now?" (respects user choice)
  ↓
Download + Prompt: "Restart to apply"
  ↓
Update.reloadAsync() (proper restart)
```

---

## Testing the Changes

### Test Snooze (24h)
```javascript
// In DevTools, manually check if snoozed:
await SecureStore.getItemAsync('lastUpdatePrompt');
// Should return a timestamp within last 24h after clicking "Later"
```

### Test Native Update Check
1. Ensure GitHub repo has `version.json` with newer version
2. Verify native update shows in Premium Modal

### Test OTA Update Flow
1. Create an OTA update via EAS
2. App checks `checkForUpdateAsync()`
3. If available, prompts user (not auto-download)
4. On "OK", downloads then prompts for restart
5. On "Relaunch", calls `Updates.reloadAsync()`

---

## Summary of Changes

| Feature | Before | After |
|---------|--------|-------|
| Snooze | ❌ None | ✅ 24h snooze w/ SecureStore |
| Native/OTA isolation | ❌ Coupled | ✅ Separate try/catch blocks |
| OTA download flow | ❌ Auto-download | ✅ Ask first, then download |
| Error handling | ❌ Generic | ✅ Specific messages |
| Restart method | ❌ `BackHandler.exitApp()` | ✅ `Updates.reloadAsync()` |
| UI | ✅ Premium BlurView | ✅ Premium BlurView (unchanged) |
