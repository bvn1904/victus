# Understanding OTA Relaunch: Why Code MUST Be Reloaded Into Memory

## Your Question
> "Isn't that defeating the purpose of OTA updates?"

**Answer: No.** A relaunch is **essential** for OTA updates to work. Here's why:

---

## The Technical Reality: Three Phases of Updates

### Phase 1: Download (Happens on Disk)
```javascript
await Updates.fetchUpdateAsync();
// New bundle now on device storage:
// /path/to/app/cache/bundle.js (NEW v1.1.0 code)
```

✅ **This is the OTA magic** — new code is downloaded silently
✅ **User can see release notes, read changelog, etc.**
✅ **No disruption yet**

---

### Phase 2: Code Execution (In Memory)
```javascript
// App is currently RUNNING with OLD code:
while (appIsRunning) {
  executeCode(bundleInMemory); // ← v1.0.0 is here
}

// Meanwhile:
// bundleOnDisk = v1.1.0 (just downloaded, ignored)
// bundleInMemory = v1.0.0 (still being executed)
```

**This is the critical point:** The app's JavaScript runtime has v1.0.0 **loaded into RAM**. The new v1.1.0 file sits on disk, **completely ignored**.

---

### Phase 3: Reload/Restart (Necessary to Update Memory)
```javascript
await Updates.reloadAsync();
```

What this does:
1. **Stop** the current JS execution
2. **Unload** the old bundle from memory
3. **Load** the new bundle from disk into memory
4. **Restart** the JS runtime with new code
5. **Resume** app execution with v1.1.0

---

## Visual Timeline

```
t=0                          User installs v1.0.0
                             bundleInMemory = v1.0.0

         ↓ (days later)

t=1      User taps "Check for Updates"
         checkForUpdateAsync() = "Update available!"
         
         ↓

t=2      User taps "Download"
         fetchUpdateAsync() completes
         bundleOnDisk = v1.1.0 (downloaded)
         bundleInMemory = v1.0.0 (still running!)
         
         ↓

t=3      User taps "Relaunch"
         reloadAsync()
         │
         ├─ STOP current execution
         ├─ UNLOAD v1.0.0 from memory
         ├─ LOAD v1.1.0 from disk into memory
         └─ RESTART app with new code
         
         bundleInMemory = v1.1.0 ✅
         
         ↓

t=4      App is now running v1.1.0
         User sees updates!
```

---

## Why Restart is Non-Negotiable

### Real-World Example: Bug Fix

**v1.0.0 Bug:** Login always fails with timeout
```javascript
// Login.js (v1.0.0)
async function login(email, password) {
  const timeout = 5000; // ❌ Bug: too short
  // ... login logic
}
```

**v1.1.0 Fix:** Timeout increased to 30 seconds
```javascript
// Login.js (v1.1.0)
async function login(email, password) {
  const timeout = 30000; // ✅ Fixed
  // ... login logic
}
```

**Scenario 1: No Restart**
```
t=1: Download v1.1.0 (with fix)
t=2: User tries to login
     → Which code runs? v1.0.0 (in memory)
     → Result: Still fails with 5s timeout ❌
     → Bug never fixed!
     → Update was pointless!
```

**Scenario 2: With Restart**
```
t=1: Download v1.1.0 (with fix)
t=2: Restart → load v1.1.0 into memory
t=3: User tries to login
     → Which code runs? v1.1.0 (in memory)
     → Result: Fixed! 30s timeout works ✅
```

---

## Alternative Methods & Why They Don't Work

### ❌ Option 1: "Don't restart, just patch memory"
- **Problem:** Runtime can't replace code while executing it
- **Why:** It's like changing the engine while the car is driving
- **Reality:** No known JS runtime supports live hot-patching without restart
- **Verdict:** Not possible

### ❌ Option 2: "Reload just the changed functions"
- **Problem:** React Native bundle is minified/optimized as single unit
- **Why:** Selective reloading would require:
  - Dependency tracking across entire codebase
  - Complex serialization of component state
  - Handling state migration between old/new components
- **Reality:** Way more brittle than full reload
- **Verdict:** More bugs, not fewer

### ❌ Option 3: "Use web views / lazy loading"
- **Problem:** App must be web-based or heavily modularized
- **Not applicable:** Victus is native React Native
- **Verdict:** Architectural mismatch

### ✅ Option 4: "Full Reload via Updates.reloadAsync()"
- **Benefit:** Clean state (no stale memory)
- **Benefit:** Guaranteed new code loads
- **Benefit:** Framework-supported & tested
- **Benefit:** Cross-platform (iOS + Android)
- **Verdict:** The standard Expo approach

---

## What About Backend Updates?

You might think: "Backend updates don't need a restart!"

**Key difference:**
- **Backend:** Stateless server processes each request independently
- **App:** Stateful runtime keeps code + state in memory across interactions

```javascript
// Backend (stateless)
request = getRequest()     // Each request is fresh
response = runCode(v1.0)   // Code version is fetched from disk
return response            // Request completes

// App (stateful)
app = startApp()           // App starts once
bundleInMemory = v1.0      // Code loaded ONE time
while (appRunning) {
  handleUserInput()        // Uses bundleInMemory repeatedly
}
// If code changes on disk, bundleInMemory ≠ disk
// until restart
```

---

## How Victus/Tempus Uses OTA Correctly

### The Smart Flow

```
User opens app
    ↓
checkForUpdateAsync()
    ↓
New OTA available?
    ├─ YES → Prompt "Download now?"
    │        ├─ "Later" → Snooze 24h
    │        └─ "OK" → fetchUpdateAsync()
    │            ↓
    │            After download → Prompt "Restart?"
    │            ├─ "Later" → Do nothing (update cached)
    │            └─ "Relaunch" → reloadAsync() ✅
    │
    └─ NO → Check native APK updates instead
```

**Key advantages:**
1. **User controls download timing** (respects data/battery)
2. **User controls restart timing** (doesn't interrupt workflow)
3. **Restart is explicit & clean** (new code guaranteed to load)
4. **Fallback to native APK** (if OTA fails)

---

## FAQ

### Q: Can't we just reload the JS engine without restarting the app?
**A:** Updates.reloadAsync() essentially does that. It doesn't kill the entire app (BackHandler.exitApp()), it gracefully restarts the JS runtime while keeping the native layer intact.

### Q: What about performance? Is restart slow?
**A:** 
- Modern devices: ~1-2 seconds
- Users expect app restarts (similar to iOS App Store updates)
- Trade-off is worth it (guaranteed correct code version)

### Q: Does the user's data get lost?
**A:** 
- Local persistent data (AsyncStorage, SQLite, etc.) is unaffected
- App state in memory is lost (expected, like any restart)
- Use persistent storage for critical state

### Q: Why not warn users before download?
**A:** The new code does! There are two prompts:
1. "Download now?" (before fetchUpdateAsync)
2. "Restart to apply?" (before reloadAsync)
User controls both decision points.

### Q: What if a user ignores the restart prompt?
**A:** 
- Update is cached on disk
- User continues with v1.0.0 code
- Next app open, update still available
- User can restart anytime (or manually force-close app)

---

## Summary

| Aspect | Answer |
|--------|--------|
| **Does OTA require restart?** | ✅ Yes, always |
| **Is this a limitation?** | ❌ No, it's correct behavior |
| **Is this inefficient?** | ❌ No, users expect app restarts |
| **Will data be lost?** | ❌ Only transient state (expected) |
| **Why can't we avoid it?** | Code must be in memory to execute |
| **Is this specific to React Native?** | ✅ Standard for all mobile OTA systems (iOS App Store, Android Google Play) |

**The OTA update is the improvement.** The restart is just how it works correctly.
