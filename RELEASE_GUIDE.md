# 🚀 Victus Release Guide

This guide covers building, releasing, and updating your app.

## 📦 Phase 1: Prepare the Release

1. **Verify `app.json` Version:**
   - Open `app.json` and ensure the `version` is correct (e.g., `1.0.0` or `1.0.1`).
   - If this is a new update, bump this number!

2. **Commit Your Changes:**
   ```bash
   git add .
   git commit -m "Your release message"
   git push origin main
   ```

---

## 🏗️ Phase 2: Build the APK

1. **Run the Build Command:**
   ```bash
   eas build -p android --profile apk --local
   ```
   *Note: If you don't have Android Studio/SDK installed locally, remove `--local` to build on Expo's cloud servers.*

2. **Locate the File:**
   - The build will output an `.apk` file (usually in the project root or `build` folder).
   
3. **Rename the File:**
   - **CRITICAL:** Rename the file to `app-release.apk`.
   - Your app looks for exactly this filename!

---

## 🌐 Phase 3: Create GitHub Release

1. Go to your repo: [https://github.com/bvn1904/victus](https://github.com/bvn1904/victus)
2. Click **Releases** > **Draft a new release**.
3. **Choose a Tag:** e.g., `v1.0.0` (Create new tag on publish).
4. **Title:** `v1.0.0 - Premium Update`
5. **Description:** List your changes (Quick Add, Date Nav, etc.).
6. **Upload Assets:** Drag & Drop your renamed `app-release.apk` here.
7. Click **Publish Release**.

---

## 📡 Phase 4: Push the Update (Trigger Users)

Now that the file is online, tell the app there's an update!

1. **Edit `version.json` Locally:**
   Open `version.json` in your code editor and update it:

   ```json
   {
     "version": "1.0.0",  // Match your app.json version
     "apkUrl": "https://github.com/bvn1904/victus/releases/latest/download/app-release.apk",
     "notes": "Added Quick Add button, Date Navigation, and bug fixes!"
   }
   ```
   *Note: If you just released v1.0.0 and users are on v1.0.0, they won't see an alert. This file is used to trigger updates when you release v1.0.1 later.*

2. **Push ONLY `version.json`:**
   ```bash
   git add version.json
   git commit -m "Update version.json for release"
   git push origin main
   ```

---

## 🔄 How to Test Updates

To simulate an update without building a new APK:

1. Go to `version.json` on **GitHub**.
2. Edit the version to be higher than your app (e.g., set `"version": "9.9.9"`).
3. Commit the change on GitHub.
4. Open your app.
5. It should see `9.9.9 > 1.0.0` and show the "Update Available" modal.
6. **Revert** the change on GitHub after testing!
