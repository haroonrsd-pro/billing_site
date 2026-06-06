import { exec, spawn } from 'child_process';
import os from 'os';

// Known path on the user's desktop to adb (Android Studio default)
const adbPath = 'C:\\Users\\balas\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';

const runCmd = (cmd) => new Promise((resolve) => {
    exec(`"${adbPath}" ${cmd}`, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr });
    });
});

async function main() {
    console.log("==========================================");
    console.log("📱 USB MOBILE PREVIEW INITIALIZER v1.0");
    console.log("==========================================\n");

    console.log("> Checking for physically connected USB devices...");
    const { stdout, error } = await runCmd("devices");

    if (error) {
        console.error("❌ ADB Error: ADB might not be installed or configured correctly.");
        console.error(error.message);
        console.log("-> Starting Vite Server directly (without ADB hooks)...");
        return startVite();
    }

    const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Ignore the "List of devices attached" line, check the rest
    const validDevices = lines.slice(1).filter(l => l.includes('device') && !l.includes('offline'));
    
    // Ignore emulator entries for checking physical devices ideally, but since we just want ANY connected phone,
    // let's grab the first non-emulator if possible. But grabbing ANY device works for `adb reverse` as long as there's 1.
    const physicalDevices = validDevices.filter(d => !d.includes('emulator'));

    if (physicalDevices.length > 0) {
        console.log(`✅ Awesome! Found a connected phone: ${physicalDevices[0].split('\t')[0]}`);
        
        // 1. Setup Reverse Port Forwarding explicitly on that device
        console.log("> Establishing secure USB reverse tunnel for localhost mapping (Port 5173)...");
        await runCmd(`reverse tcp:5173 tcp:5173`);
        
        console.log("> Booting up React App...");
        startVite(true);
    } else {
        console.log("⚠️ No physical Android device detected via USB Debugging.");
        console.log(`\nTo get this to work:\n 1. Connect Android via USB.\n 2. Enable "USB Debugging" in Developer Options.\n 3. Accept "Allow USB Debugging" on phone screen.\n`);
        console.log("> Starting Vite Server anyway...");
        startVite(false);
    }
}

function startVite(autoLaunch = false) {
    // We run `vite --host` so that it exposes networking bounds safely
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    
    console.log(`\n🚀 Firing up Local Dev Server on http://localhost:5173/\n`);

    const child = spawn(npmCmd, ['run', 'dev', '--', '--host'], {
        stdio: 'inherit',
        shell: true
    });

    if (autoLaunch) {
        setTimeout(async () => {
            console.log("\n📲 Sending command to open phone's browser automatically...");
            await runCmd(`shell am start -a android.intent.action.VIEW -d "http://localhost:5173"`);
            console.log("✨ Done! You should see the App loaded on your smartphone momentarily.");
            console.log("   (Any hot-reload saves here will instantly appear on the phone!)");
        }, 3500); // 3.5 seconds wait for Vite to initialize the build
    }

    child.on('close', (code) => {
        console.log(`Vite server shut down.`);
        process.exit(code);
    });
}

main();
