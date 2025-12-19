# MyGroCart Mobile - Quick Start Guide

## Prerequisites

- ✅ Backend server running on port 5000
- ✅ Expo Go app installed on your phone
- ✅ Node.js 18+ and pnpm installed

## Step 1: Start Backend Server

Open a new terminal and run:

```bash
cd /Users/jimelj/WebDev/MyGroCart/mygrocart-backend-node
pnpm dev
```

Verify backend is running:
- You should see: "Server ready at http://localhost:5000/graphql"
- GraphQL Playground: http://localhost:5000/graphql

## Step 2: Configure Mobile App

**For Physical Devices (Required for Barcode Scanner):**

1. Find your computer's IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Example output: inet 192.168.1.100
   ```

2. Update `.env` file:
   ```bash
   cd /Users/jimelj/WebDev/MyGroCart/mygrocart-mobile
   nano .env
   ```

3. Replace localhost with your IP:
   ```
   EXPO_PUBLIC_GRAPHQL_ENDPOINT=http://192.168.1.100:5000/graphql
   ```

**For iOS Simulator (Search only, camera won't work):**
- Keep `http://localhost:5000/graphql`

## Step 3: Start Mobile App

```bash
cd /Users/jimelj/WebDev/MyGroCart/mygrocart-mobile
pnpm dev
```

You should see:
```
› Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

## Step 4: Open in Expo Go

### iOS
1. Open Camera app
2. Point at QR code
3. Tap notification "Open in Expo Go"

### Android
1. Open Expo Go app
2. Tap "Scan QR code"
3. Point at QR code on terminal

## Step 5: Test Features

### 1. Test Home Screen
- ✅ Verify greeting appears
- ✅ See 3 action cards
- ✅ Tap "Scan Barcode" → goes to Scanner
- ✅ Tap "Search Products" → goes to Search

### 2. Test Barcode Scanner
1. Navigate to "Scanner" tab
2. Allow camera permissions (tap "Allow")
3. Point camera at product barcode:
   - **Recommended test products:**
     - Coca-Cola can/bottle
     - Pepsi can/bottle
     - Lay's chips bag
     - Any packaged food with UPC/EAN barcode
4. Wait for green corners to appear
5. Barcode should scan automatically
6. Verify product info appears:
   - Product name
   - Brand
   - Size
   - UPC code
7. Tap "Add to List"
8. Verify success message
9. Choose "View List" or "Scan Another"

**Troubleshooting Scanner:**
- ❌ Camera not working → Check you're on physical device (not simulator)
- ❌ Permission denied → Go to Settings → Expo Go → Enable Camera
- ❌ Product not found → Try different product (OpenFoodFacts database)
- ❌ Nothing happens → Ensure good lighting, hold barcode steady

### 3. Test Product Search
1. Navigate to "Search" tab
2. Type "milk" in search bar
3. Wait ~500ms (debounce)
4. Verify results appear
5. Try other searches:
   - "bread"
   - "eggs"
   - "chicken"
   - "yogurt"
6. Tap green "+" icon on any product
7. Verify "Success!" alert

**Troubleshooting Search:**
- ❌ No results → Check backend is running
- ❌ Network error → Check `.env` has correct IP
- ❌ Slow search → Normal, GraphQL query takes time

### 4. Test Shopping List
1. Navigate to "List" tab
2. Verify added products appear
3. Test quantity controls:
   - Tap "-" to decrease
   - Tap "+" to increase
4. Test remove:
   - Tap trash icon
   - Confirm in dialog
5. Tap "Compare Prices" button (if available)

**Troubleshooting List:**
- ❌ List empty → Add products first via Scanner or Search
- ❌ Not logged in → Login screen not implemented yet (Phase 2)

### 5. Test Profile
1. Navigate to "Profile" tab
2. Verify user info displays (or "Not Logged In")
3. Scroll through settings menu
4. Try logout (if logged in)

## Step 6: Verify Navigation

- ✅ All 5 tabs work
- ✅ Active tab is green (#16A34A)
- ✅ Inactive tabs are gray (#9CA3AF)
- ✅ Icons change (filled when active)
- ✅ Scanner has no header (full screen)
- ✅ Other screens have headers

## Common Issues

### Backend Connection Error

**Symptom:** "Network request failed" or "Failed to fetch"

**Solutions:**
1. Verify backend is running: `curl http://localhost:5000/graphql`
2. Check `.env` has correct IP (not localhost for physical devices)
3. Ensure phone and computer on same WiFi network
4. Try restarting Expo: `r` in terminal

### Camera Permissions

**Symptom:** "Camera Access Denied"

**Solutions:**
1. Close Expo Go app completely
2. Go to Settings → Expo Go → Enable Camera
3. Reopen app and try again
4. If still denied, reinstall Expo Go

### Barcode Not Scanning

**Symptom:** Camera shows but nothing happens

**Solutions:**
1. Ensure good lighting
2. Hold barcode 6-12 inches from camera
3. Keep barcode steady for 2-3 seconds
4. Try different products (some barcodes not in OpenFoodFacts)
5. Check barcode is UPC/EAN format (not QR code)

### App Crashes

**Symptom:** App closes or freezes

**Solutions:**
1. Shake phone → "Reload"
2. In terminal: press `r` to reload
3. Clear cache: press `shift+r` in terminal
4. Restart Expo: `Ctrl+C` then `pnpm dev`

### TypeScript Errors in Terminal

**Symptom:** Red errors in terminal during start

**Solution:**
- These are expected (pnpm module resolution)
- App still works correctly
- Safe to ignore during development

## Expected Behavior

### Successful Flow
1. ✅ Backend running on port 5000
2. ✅ Mobile app starts without errors
3. ✅ QR code scans and opens app
4. ✅ Home screen appears
5. ✅ All tabs navigate correctly
6. ✅ Barcode scanner shows camera
7. ✅ Product search returns results
8. ✅ Add to list works
9. ✅ List displays items
10. ✅ Quantity controls work

### Performance Expectations
- **Search debounce:** 500ms delay (intentional)
- **Barcode scan:** 1-2 seconds to fetch from OpenFoodFacts
- **GraphQL queries:** 200-500ms depending on network
- **Navigation:** Instant (React Navigation is fast)

## Development Tools

### Reload App
- Press `r` in terminal
- Or shake phone → "Reload"

### Debug Menu
- Shake phone → Options:
  - Reload
  - Debug Remote JS (Chrome DevTools)
  - Show Performance Monitor
  - Show Element Inspector

### Clear Cache
- Press `Shift+R` in terminal
- Or: Delete app from Expo Go and reload

### View Logs
- Terminal shows console.log output
- Use `console.log()` in code for debugging

## Next Steps

After successful testing:
1. ✅ Verify all features work
2. ✅ Take screenshots for documentation
3. ✅ Report any bugs or issues
4. 📝 Plan Phase 2 features (login/signup screens)

## Support

For issues:
1. Check this guide's "Common Issues" section
2. Review `/Users/jimelj/WebDev/MyGroCart/mygrocart-mobile/README.md`
3. Check Expo documentation: https://docs.expo.dev
4. Review backend logs for GraphQL errors

## Success Criteria

✅ Backend server running
✅ Mobile app launches in Expo Go
✅ Barcode scanner can scan products
✅ Product search returns results
✅ Add to list mutation works
✅ Shopping list displays items
✅ Navigation works between all tabs

---

**Happy Testing!** 🎉

If you encounter any issues not covered here, document them for Phase 2 improvements.
