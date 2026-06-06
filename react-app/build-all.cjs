const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log("=== STEP 1: Building React Web Assets & Electron EXE ===");
  execSync('npm run electron:build', { stdio: 'inherit' });
  console.log("-> Electron EXE Build Successful.\n");

  console.log("=== STEP 2: Syncing Web Assets with Capacitor Android ===");
  execSync('npx cap sync android', { stdio: 'inherit' });
  console.log("-> Capacitor Sync Successful.\n");

  console.log("=== STEP 3: Compiling Android APK via Gradle ===");
  // Ensure we use the correct gradlew wrapper path based on the OS
  const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  
  // Set the current working directory to the 'android' folder
  execSync(`${gradlewCmd} assembleDebug`, { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, 'android')
  });
  console.log("-> Android APK Compiled Successfully.\n");

  // Output Files Summary
  const apkPath = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  const targetApk = path.join(__dirname, 'FoodBill_Final.apk');
  
  if (fs.existsSync(apkPath)) {
    fs.copyFileSync(apkPath, targetApk);
    console.log(`\n✅ Copied APK to project root: ${targetApk}`);
  }

  console.log(`✅ Electron EXE is available in the /dist-electron/ directory.`);
  
} catch (error) {
  console.error("❌ Build process failed:", error.message);
  process.exit(1);
}
