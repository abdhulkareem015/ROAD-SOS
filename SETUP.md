# 🛠️ Detailed Setup & Installation Guide - RoadSOS

This document provides a step-by-step explanation of how to configure, set up, and run both the **RoadSOS Express Backend Server** and the **RoadSOS React Native Mobile Client** on your local machine.

---

## 📋 Prerequisites
Before starting, ensure you have the following software installed:
1. **Node.js (LTS version recommended):** Runs the JavaScript runtime for both the backend server and Expo packager.
   * Verify using: `node -v` (version should be `v18.x.x`, `v20.x.x`, or higher).
2. **npm (Node Package Manager):** Installs project dependencies.
   * Verify using: `npm -v`.
3. **Expo Go (on physical mobile device):** Optional, but recommended for testing on your physical phone (available on App Store and Google Play).
4. **Android Studio / Xcode:** For running on Android Emulator or iOS Simulator (optional).

---

## 📂 Project Architecture Overview
The project is split into two components:
1. **`server/` (Backend):** A Node.js server that stores emergency data in a local JSON database and simulates broadcast systems.
2. **`App.js` & `package.json` (Frontend):** The Expo React Native application containing all screens, maps, custom telemetry interfaces, and offline-first client code.

---

## 🛠️ Step-by-Step Installation

### Part 1: Setting up the Backend Server

The backend server is responsible for syncing contacts, storing witness reports, and printing simulated SMS notifications and Firebase Cloud Messaging (FCM) payloads.

#### Step 1.1: Open your terminal and navigate to the server directory
Run the following command to move into the server folder:
```bash
cd RoadSOS-main/server
```

#### Step 1.2: Install server dependencies
Run the installation command to download the required Node modules (`express`, `cors`, etc.) defined in the server's `package.json`:
```bash
npm install
```
* **Explanation:** This creates a `node_modules` folder inside your `server` directory and downloads all server libraries.

#### Step 1.3: Start the server
Launch the Express backend:
```bash
npm start
```
* **Explanation:** This runs `node server.js`. You should see the console print:
  ```text
  🚀 RoadSOS server running on http://localhost:3000
  📁 Local JSON database loaded at .../server/db.json
  ```
* **Health Check:** Open your web browser and navigate to `http://localhost:3000/api/health`. You should see a JSON message: `{"status":"ok","message":"RoadSOS Server is running smoothly"}`.

---

### Part 2: Setting up the React Native Mobile Client

The mobile frontend is built on **Expo SDK 54**. It leverages Metro as the development bundler to compile your Javascript code dynamically.

#### Step 2.1: Navigate to the client directory
From the root workspace, navigate into the frontend folder (or if you are in `server/`, navigate up one level):
```bash
cd ..
```
* **Explanation:** Ensure your active command directory contains the root `package.json` (not the one in `server/`).

#### Step 2.2: Install frontend dependencies
Install all native wrappers, maps, coordinates trackers, and storage hooks:
```bash
npm install
```
* **Explanation:** This reads the client's `package.json` and installs libraries like `react-native-maps`, `expo-location`, and `@react-native-async-storage/async-storage`.

#### Step 2.3: Start the Expo Metro Bundler
Start the Metro Development server:
```bash
npx expo start
```
* **Explanation:** Metro compiles your application files into a unified bundle. The command-line interface will output a large QR code and present several interactive hotkeys.

---

### Part 3: Running and Testing the App

You can preview the app on your mobile device, simulator, or web browser:

1. **On a Physical Device (Recommended):**
   * Download the **Expo Go** app on your phone.
   * Open your phone camera or the Expo Go app.
   * Scan the Metro Bundler QR code shown in your terminal.
   * The app will download the bundle and launch.
2. **On the Android Emulator:**
   * Make sure Android Studio is installed and your virtual device is running.
   * Press **`a`** in your terminal. Expo will install Expo Go onto your emulator and open the app.
3. **On the iOS Simulator (macOS only):**
   * Press **`i`** in your terminal to boot up the Xcode Simulator and launch the app.
4. **On a Web Browser:**
   * Press **`w`** in your terminal. It will open `http://localhost:8081` in your browser. (Note: GPS telemetry features and maps may request location access prompts).

---

## 🌐 Connecting the Client to the Server (Crucial Network Step)

To allow the mobile app to sync with the backend server, the app needs to know where the server is located on the network.

### 1. Web and Simulators
* **Web Browser:** Connects to `http://localhost:3000` automatically.
* **Android Emulator:** Connects to `http://10.0.2.2:3000` (which redirects virtual traffic to your host computer's localhost).

### 2. Physical Mobile Devices (via Wi-Fi)
If testing on a real phone via Expo Go, `localhost` refers to your phone itself, so it will fail to connect. You must route connections through your computer's local network IP address:

#### Step A: Find your computer's local IP address
* **Windows (PowerShell/CMD):** Run `ipconfig`. Look for `IPv4 Address` under your wireless adapter (e.g., `192.168.1.75`).
* **Mac/Linux (Terminal):** Run `ifconfig` or `ip a`. Look for the local IP address (usually starting with `192.168.` or `10.`).

#### Step B: Set the URL in the App
1. Open the RoadSOS app on your phone.
2. Tap the **Safety** tab (shield icon 🛡️) at the bottom.
3. Scroll down to the **API Server Connection** card.
4. In the **Backend Server URL** input field, replace `http://localhost:3000` with your computer's IP address (e.g., `http://192.168.1.75:3000`).
5. Tap **Test Connection**. It will display `ONLINE (CONNECTED)` if successful!

---

## 🔍 Troubleshooting Setup Issues

### ❌ Error: "Network Request Failed"
* **Check the server:** Ensure your Express server console is active.
* **Firewall/Network configuration:** Ensure your computer and mobile phone are connected to the **exact same Wi-Fi network**.
* **IP check:** Ensure you typed the correct IP address in the Safety tab.

### ❌ Error: "Port 3000 already in use"
* **Solution:** Another process is running on port 3000. You can stop it, or edit the `PORT` variable in [server.js](file:///d:/RoadSOS-main/RoadSOS-main/server/server.js#L7) (e.g., change `3000` to `4000`) and update the backend URL inside the mobile client settings.

### ❌ Error: "Location permission denied"
* **Solution:** The app requires GPS permissions to get satellite coordinates. Grant location permissions when prompted by your device or Emulator settings, or test in an area with a clear line-of-sight to GPS satellites.
