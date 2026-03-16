# Update Flow Diagram

## Overall Update System Flow

```
┌─────────────────────────────────────────────────────────┐
│ APP STARTUP (useEffect)                                │
│ calls checkUpdates()                                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────────┐
         │ Check Snooze      │
         │ (SecureStore)     │
         └─────┬─────────────┘
               │
         ┌─────▼─────┐
         │ Snoozed?  │
         └─┬────┬─────┘
           │    │
        YES│    │NO
           │    │
           │    ▼
           │   ┌──────────────────────┐
           │   │ CHECK A:             │
           │   │ Native Update        │
           │   │ (GitHub APK)         │
           │   └──┬──────────────────┘
           │      │
           │      ├─ Try: Fetch GitHub
           │      │  - If response.ok → Parse JSON
           │      │  - Compare versions
           │      │  - If newer → Show Modal ✅
           │      │              Return (stop here)
           │      │
           │      └─ Catch: Log & ignore
           │          Continue to B
           │
           │    ┌──────────────────────┐
           │    │ CHECK B:             │
           │    │ OTA Update           │
           │    │ (Expo Bundle)        │
           │    └──┬──────────────────┘
           │       │
           │       ├─ Try: checkForUpdateAsync()
           │       │  - If available → showOTAUpdatePrompt()
           │       │
           │       └─ Catch: Log & ignore
           │
           ▼
    ┌─────────────────┐
    │ Update Check    │
    │ Complete        │
    └─────────────────┘
```

---

## Native Update Modal Flow

```
┌──────────────────────────┐
│ Native Update Available  │
│ (Premium Modal with UI)  │
│                          │
│ v1.1.0 is ready          │
│ What's New: ...          │
│                          │
│ [Later]  [Download]      │
└────┬───────────┬──────────┘
     │           │
     │ User      │ User
     │ clicks    │ clicks
     │ "Later"   │ "Download"
     │           │
     ▼           ▼
  ┌──────────┐  ┌──────────┐
  │ Snooze   │  │ Open URL │
  │ 24h      │  │ (APK)    │
  │ Close    │  │ Close    │
  │ Modal    │  │ Modal    │
  └──────────┘  └──────────┘
     │             │
     └─────┬───────┘
           │
           ▼
    ┌─────────────────┐
    │ Native Update   │
    │ Dialog Closed   │
    └─────────────────┘
```

---

## OTA Update Flow (Multi-Step)

```
┌──────────────────────────────────┐
│ Step 1: Check Availability       │
│ checkForUpdateAsync()            │
│ No network error? No version?    │
└──────────────┬───────────────────┘
               │
         ┌─────▼──────┐
         │ Available? │
         └─┬────┬─────┘
        NO │    │ YES
           │    │
       [Skip]  ▼
           │   ┌──────────────────────────────┐
           │   │ Step 2: Ask User             │
           │   │ "Download now?"              │
           │   │                              │
           │   │ [Later] [OK]                 │
           │   └────┬──────────┬──────────────┘
           │        │          │
           │      Snooze   Downloads
           │      24h       Begins
           │        │          │
           │        │          ▼
           │        │    ┌──────────────────────────────┐
           │        │    │ Step 3: Downloading          │
           │        │    │ fetchUpdateAsync()           │
           │        │    │                              │
           │        │    │ [Progress bar or waiting]    │
           │        │    └────┬─────────────┬───────────┘
           │        │         │             │
           │        │      Success      Error
           │        │         │             │
           │        │         ▼             ▼
           │        │    ┌──────────┐  ┌─────────────┐
           │        │    │Downloaded│  │Alert Error  │
           │        │    │Bundle    │  │Message      │
           │        │    │to Disk   │  │"Try Again"  │
           │        │    └────┬─────┘  └─────────────┘
           │        │         │             │
           │        │         ▼             │
           │        │    ┌──────────────────────────────┐
           │        │    │ Step 4: Prompt Restart       │
           │        │    │ "Restart to apply update?"   │
           │        │    │                              │
           │        │    │ [Relaunch]                   │
           │        │    └────┬──────────────────────────┘
           │        │         │
           │        │         ▼
           │        │    ┌──────────────────────────────┐
           │        │    │ Step 5: Restart              │
           │        │    │ Updates.reloadAsync()        │
           │        │    │                              │
           │        │    │ 1. Stop JS execution         │
           │        │    │ 2. Unload v1.0.0 from RAM   │
           │        │    │ 3. Load v1.1.0 from disk    │
           │        │    │ 4. Restart JS runtime       │
           │        │    └────┬──────────────────────────┘
           │        │         │
           │        │         ▼
           │        │    ┌──────────────────────────────┐
           │        │    │ App Running v1.1.0 ✅       │
           │        │    │ User sees updates            │
           │        │    └──────────────────────────────┘
           │        │
           └────┬───┘
                │
                ▼
          ┌──────────────────┐
          │ Dialog Closed    │
          │ Update Complete  │
          └──────────────────┘
```

---

## Error Recovery Paths

```
Native Update Check
├─ GitHub unreachable
│  └─ Catch & log
│     └─ Continue to OTA check
│        └─ OTA may still work ✅
│
├─ Response not OK (404)
│  └─ Log "skipped"
│     └─ Continue to OTA check
│        └─ OTA may still work ✅
│
└─ Version parsing fails
   └─ Catch & log
      └─ Continue to OTA check
         └─ OTA may still work ✅

OTA Update Check
├─ checkForUpdateAsync fails
│  └─ Catch & log
│     └─ No update prompt shown
│        └─ User continues with current version
│
├─ fetchUpdateAsync fails
│  └─ Alert shown with error message
│     └─ User can retry later
│        └─ Update not deleted from cache
│           └─ Can retry in future session
│
└─ reloadAsync fails
   └─ Rare case (should not happen)
      └─ User can manually restart app
         └─ Update will apply on next start
```

---

## State Management Timeline

```
BEFORE checkUpdates():
├─ modalVisible: false
├─ remoteVersion: ''
├─ releaseNotes: ''
├─ apkUrl: ''
└─ updateType: 'native'

After finding native update:
├─ modalVisible: true ✅
├─ remoteVersion: '1.1.0' ✅
├─ releaseNotes: 'Bug fixes...' ✅
├─ apkUrl: 'https://...' ✅
└─ updateType: 'native' ✅

After user clicks modal "Later":
├─ modalVisible: false ✅
├─ SecureStore.lastUpdatePrompt: <timestamp> ✅
└─ Next checkUpdates() will skip all checks for 24h ✅
```

---

## Comparison: Old vs New

### Old Flow (❌ Problems)

```
App Start
  ↓
checkUpdates() [No snooze check]
  ↓
Try both OTA + GitHub in same try block
  ↓
OTA: checkForUpdateAsync()
  ↓
If available: Auto fetchUpdateAsync()
  ↓
Show alert AFTER download
  ↓
Use BackHandler.exitApp() [Bad!]
```

**Issues:**
- ❌ No snooze → nag every session
- ❌ Coupled checks → one failure breaks other
- ❌ Auto-download → no user control
- ❌ Wrong restart method → platform issues

---

### New Flow (✅ Fixed)

```
App Start
  ↓
checkUpdates()
  ↓
Check snooze → if yes, return
  ↓
GitHub (own try/catch) → check APK
  ├─ Success: Show modal, return
  └─ Fail: Continue anyway
  ↓
Expo (own try/catch) → check OTA
  ├─ Available: Show prompt (ask first!)
  └─ Fail: Log and ignore
  ↓
Two-step OTA process:
  Step 1: "Download now?" [Later/OK]
  Step 2: "Restart?" [Relaunch]
  ↓
Use Updates.reloadAsync() [Correct!]
```

**Improvements:**
- ✅ Snooze → respect user preferences
- ✅ Separated checks → resilience
- ✅ Ask before download → user control
- ✅ Correct restart → cross-platform
- ✅ Better error handling → helpful messages
