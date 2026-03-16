# UpdateManager.js Enhancement - Complete Documentation

## 📋 Quick Summary

The `UpdateManager.js` component has been upgraded with **5 major improvements** from the Tempus project while maintaining Victus's **premium BlurView UI design**:

1. **✅ 24-hour snooze functionality** (SecureStore)
2. **✅ Separated native vs OTA checks** (isolated error handling)
3. **✅ Immediate OTA prompts** (ask before downloading)
4. **✅ Better error handling** (specific, actionable messages)
5. **✅ Proper restart flow** (Updates.reloadAsync())

---

## 📚 Documentation Files

### 1. **UPDATE_MANAGER_IMPROVEMENTS.md** 📖
**Read this first for overview**
- What was improved and why
- Technical details for each improvement
- Explanation of "why relaunch is always required"
- Premium UI preservation details

### 2. **CHANGES_SUMMARY.md** 📝
**For developers implementing the code**
- Line-by-line changes explained
- Purpose of each addition/modification
- Impact on behavior
- Testing checklist

### 3. **COMPARISON.md** 🔄
**For understanding before/after**
- Side-by-side code comparison
- Problem statements
- Solution explanations
- Summary table

### 4. **RELAUNCH_EXPLANATION.md** 🚀
**For answering "Why restart is necessary?"**
- Technical explanation of bundle loading
- Real-world examples (bug fixes)
- Why alternative methods don't work
- FAQ section
- **This file specifically addresses your "isn't that defeating the purpose?" question**

### 5. **UPDATE_FLOW_DIAGRAM.md** 🔀
**For visual learners**
- Overall system flow diagram
- Native update modal flow
- OTA update multi-step flow
- Error recovery paths
- State management timeline
- Old vs new comparison

---

## 🎯 Key Features Implemented

### Feature 1: 24-Hour Snooze
```javascript
// When user clicks "Later"
await SecureStore.setItemAsync('lastUpdatePrompt', Date.now().toString());

// On next app startup
const lastPromptStr = await SecureStore.getItemAsync('lastUpdatePrompt');
if (Date.now() - lastPrompt < SNOOZE_DURATION) {
  return; // Skip all update checks
}
```

**Benefit:** Users won't be nagged about same update every session

---

### Feature 2: Separated Update Checks
```javascript
// --- CHECK A: Native Update (GitHub APK) ---
try { /* ... */ } catch (e) { console.log('Native failed'); }

// --- CHECK B: OTA Update (Expo) ---
try { /* ... */ } catch (e) { console.log('OTA failed'); }
```

**Benefit:** GitHub failure doesn't prevent Expo OTA from working

---

### Feature 3: Two-Step OTA Process
```
Step 1: "Download now?" → User chooses
Step 2: "Download" → App downloads
Step 3: "Restart?" → User chooses
Step 4: "Relaunch" → Updates.reloadAsync()
```

**Benefit:** User controls both download and restart timing

---

### Feature 4: Better Error Handling
```javascript
// Each failure has specific context
console.log('Native check failed (ignoring):', e);
console.log('OTA update check failed:', e);
Alert.alert('Error', 'Failed to download update. Please try again later.');
```

**Benefit:** Clear, actionable error messages

---

### Feature 5: Correct Restart Method
```javascript
// Before: ❌ BackHandler.exitApp() (Android-only, poor UX)
// After: ✅ Updates.reloadAsync() (Expo standard)
await Updates.reloadAsync();
// Gracefully: Stop JS → Unload old code → Load new code → Restart runtime
```

**Benefit:** Cross-platform, smooth restart that applies OTA update

---

## 💾 What Was Changed

**File:** `src/components/UpdateManager.js`

### Additions:
- Import `SecureStore` for snooze storage
- `SNOOZE_DURATION` constant
- Snooze check in `checkUpdates()`
- Separated native/OTA try/catch blocks
- `showOTAUpdatePrompt()` function
- `snoozeUpdate()` function
- `handleLater()` function
- Modal "Later" button now calls snooze

### Unchanged:
- All BlurView styling
- All LinearGradient styling
- All Lucide icon usage
- Modal animations
- Theme integration

---

## 🧪 Testing Guide

### Test 1: Snooze Functionality
1. Click "Later" on any update
2. Force-close and reopen app
3. Update should NOT appear (snoozed)
4. Wait 24 hours (or manually clear SecureStore)
5. Update should appear again

### Test 2: GitHub Failure Doesn't Block OTA
1. Disconnect internet or delete version.json
2. App still checks for OTA updates
3. If OTA available, prompts user
4. GitHub failure doesn't crash update system

### Test 3: OTA Two-Step Process
1. Create OTA update via EAS
2. App shows "Download now?" prompt
3. Click "Later" → snoozed, nothing downloaded ✓
4. Click "OK" → starts download
5. After download → shows "Restart?" prompt
6. Click "Relaunch" → app restarts with new code ✓

### Test 4: Premium UI Intact
1. Check native update modal appears
2. Verify BlurView background blur
3. Verify LinearGradient button colors
4. Verify Lucide icons display
5. Verify animation smooth

---

## ❓ FAQ

### Q: Why does OTA require a restart?
**A:** Code must be loaded into memory to execute. See **RELAUNCH_EXPLANATION.md** for detailed answer with examples.

### Q: Can we hot-patch code without restart?
**A:** No. JS runtime doesn't support live patching. Full reload is needed.

### Q: What if network fails during download?
**A:** `fetchUpdateAsync()` throws error → Alert shown → User can retry later. Update not lost.

### Q: Does restart lose user data?
**A:** Transient state lost (expected). Persistent data (AsyncStorage, SQLite) preserved.

### Q: Can user skip the restart?
**A:** Yes. They can click elsewhere or force-close. Update stays cached. Works on next restart.

### Q: Why separate native and OTA checks?
**A:** Resilience. GitHub failure shouldn't prevent Expo updates. Each has own error handling.

### Q: Is this different from app store updates?
**A:** Similar concept. iOS App Store/Android Play Store also restart app after update.

---

## 🔍 Code Structure

```
UpdateManager.js
├── Imports (React, Expo, SecureStore, UI)
├── Constants (UPDATE_CHECK_URL, SNOOZE_DURATION)
├── Component (UpdateManager)
│   ├── State (modalVisible, remoteVersion, releaseNotes, apkUrl, updateType)
│   ├── useEffect (calls checkUpdates on mount)
│   ├── checkUpdates() 
│   │   ├── DEV mode skip
│   │   ├── Snooze check
│   │   ├── CHECK A: Native (GitHub)
│   │   └── CHECK B: OTA (Expo)
│   ├── showOTAUpdatePrompt() (two-step flow)
│   ├── snoozeUpdate() (SecureStore)
│   ├── compareVersions() (semantic version)
│   ├── handleUpdate() (open APK URL)
│   ├── handleLater() (snooze + close)
│   └── Render (Modal with BlurView, LinearGradient, Lucide)
└── Styles (StyleSheet with theme colors)
```

---

## 📊 Behavior Changes

| Behavior | Before | After |
|----------|--------|-------|
| **App startup** | Always prompt | Check snooze first |
| **GitHub fails** | Breaks OTA | OTA still works |
| **OTA available** | Auto-download | Ask first |
| **"Later" clicked** | Just close | Snooze 24h |
| **Download fails** | Generic error | Specific message |
| **Restart method** | BackHandler.exitApp() | Updates.reloadAsync() |
| **Native "Later"** | Just close | Snooze 24h |
| **Error recovery** | Cascading failure | Graceful fallback |
| **UI Style** | Premium Modal | Premium Modal ✅ |

---

## ✅ Verification Checklist

Before deploying:

- [ ] `src/components/UpdateManager.js` has all changes
- [ ] `expo-secure-store` is installed in package.json
- [ ] No TypeScript errors
- [ ] Modal UI renders without errors
- [ ] Native update check works
- [ ] OTA update check works
- [ ] Snooze functionality works
- [ ] Error messages display correctly
- [ ] Premium UI (BlurView, gradients) looks good

---

## 🚀 Deployment

1. **Commit code changes:**
   ```bash
   git add src/components/UpdateManager.js
   git commit -m "feat: Enhance UpdateManager with snooze, separated checks, and better error handling"
   ```

2. **Update version.json** if making native update:
   ```json
   {
     "version": "1.1.0",
     "notes": "Performance improvements and bug fixes",
     "apkUrl": "https://..."
   }
   ```

3. **Build and test EAS:**
   ```bash
   eas build --platform android
   ```

4. **Create OTA update (optional):**
   ```bash
   eas update
   ```

---

## 📞 Support

- **For update flow questions:** See UPDATE_FLOW_DIAGRAM.md
- **For code changes details:** See CHANGES_SUMMARY.md
- **For before/after comparison:** See COMPARISON.md
- **For relaunch explanation:** See RELAUNCH_EXPLANATION.md
- **For implementation guide:** See UPDATE_MANAGER_IMPROVEMENTS.md

---

## 📄 Files Modified

- ✅ `src/components/UpdateManager.js` - Enhanced with all improvements
- ✅ This README - Documentation index

---

**Last Updated:** March 16, 2024
**Version:** UpdateManager v2.0 (Tempus improvements integrated)
**Status:** Ready for testing
