# 🔧 QR Scanner Troubleshooting Guide

## 🚨 **"Image is not uploaded" - Common Issues & Solutions**

### **1. Camera Permission Issues**

#### **Problem**: Camera access denied
**Symptoms**: 
- Error message: "Camera access denied"
- Camera doesn't start
- Browser shows permission prompt but camera still doesn't work

**Solutions**:
1. **Check Browser Permissions**:
   - Click the camera icon in the browser address bar
   - Select "Allow" for camera access
   - Refresh the page after allowing permissions

2. **Browser Settings**:
   - Chrome: Settings → Privacy and Security → Site Settings → Camera
   - Firefox: Settings → Privacy & Security → Permissions → Camera
   - Safari: Safari → Preferences → Websites → Camera

3. **Clear Site Data**:
   - Clear browser cache and cookies for the site
   - Try in incognito/private mode

### **2. HTTPS/Protocol Issues**

#### **Problem**: Camera not working on HTTP
**Symptoms**:
- Camera works on localhost but not on production
- Error: "getUserMedia() not supported"

**Solutions**:
1. **Use HTTPS**: Camera access requires secure connection
2. **Localhost Exception**: Works on `http://localhost` for development
3. **Production Setup**: Ensure your domain uses HTTPS

### **3. Browser Compatibility Issues**

#### **Problem**: Camera not supported in browser
**Symptoms**:
- Error: "getUserMedia not supported"
- Camera doesn't initialize

**Solutions**:
1. **Supported Browsers**:
   - ✅ Chrome 53+
   - ✅ Firefox 36+
   - ✅ Safari 11+
   - ✅ Edge 12+

2. **Update Browser**: Use the latest version
3. **Try Different Browser**: Test in Chrome if using Firefox

### **4. Device/Hardware Issues**

#### **Problem**: No camera detected
**Symptoms**:
- Error: "No camera found"
- Camera list is empty

**Solutions**:
1. **Check Physical Camera**:
   - Ensure camera is connected
   - Check if camera is being used by another application
   - Restart device if needed

2. **Camera Drivers**:
   - Update camera drivers
   - Check device manager for camera status

### **5. Scanner Component Issues**

#### **Problem**: Scanner doesn't render properly
**Symptoms**:
- Scanner container is empty
- Camera view doesn't appear
- JavaScript errors in console

**Solutions**:
1. **Check Console Errors**:
   - Open browser developer tools (F12)
   - Look for JavaScript errors
   - Check network tab for failed requests

2. **Component Initialization**:
   - Ensure `html5-qrcode` is installed: `npm install html5-qrcode`
   - Check if scanner container has proper ID
   - Verify scanner configuration

### **6. Network/API Issues**

#### **Problem**: Scanner works but verification fails
**Symptoms**:
- Camera starts but QR codes don't verify
- Network errors in console

**Solutions**:
1. **Check Backend**:
   - Ensure backend server is running
   - Verify API endpoints are accessible
   - Check authentication tokens

2. **Network Connectivity**:
   - Test API endpoints manually
   - Check CORS settings
   - Verify proxy configuration

## 🧪 **Testing Steps**

### **Step 1: Use QR Test Component**
1. Click "QR Test" button in Admin Dashboard
2. Check browser support status
3. Test camera access
4. Review error messages

### **Step 2: Manual Camera Test**
```javascript
// Test in browser console
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    console.log('Camera access successful');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(error => {
    console.error('Camera access failed:', error);
  });
```

### **Step 3: Check Environment**
- Protocol: Should be `https:` or `http://localhost`
- Browser: Modern browser with camera support
- Device: Has working camera
- Permissions: Camera access allowed

## 🔧 **Quick Fixes**

### **Fix 1: Camera Permission Reset**
```javascript
// Clear camera permissions
navigator.permissions.query({ name: 'camera' })
  .then(permissionStatus => {
    if (permissionStatus.state === 'denied') {
      // Guide user to browser settings
      alert('Please enable camera in browser settings');
    }
  });
```

### **Fix 2: Scanner Reinitialization**
```javascript
// Force scanner restart
const restartScanner = () => {
  if (scannerRef.current) {
    scannerRef.current.clear();
  }
  // Reinitialize scanner
  setScanning(false);
  setTimeout(() => setScanning(true), 100);
};
```

### **Fix 3: Alternative Camera Selection**
```javascript
// Try different camera constraints
const constraints = {
  video: {
    facingMode: 'environment', // Back camera
    // facingMode: 'user', // Front camera
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
};
```

## 📱 **Mobile-Specific Issues**

### **iOS Safari Issues**
- **Problem**: Camera doesn't work on iOS Safari
- **Solution**: Use Chrome or Firefox on iOS

### **Android Chrome Issues**
- **Problem**: Camera permission not requested
- **Solution**: Clear site data and try again

### **Mobile Camera Orientation**
- **Problem**: Camera view is rotated
- **Solution**: Add orientation constraints to scanner config

## 🐛 **Debug Information**

### **Check These Logs**:
1. **Browser Console**: JavaScript errors
2. **Network Tab**: Failed API requests
3. **Application Tab**: Camera permissions
4. **Console Logs**: Scanner initialization messages

### **Common Error Messages**:
- `NotAllowedError`: Camera permission denied
- `NotFoundError`: No camera found
- `NotSupportedError`: Camera not supported
- `NotReadableError`: Camera in use by another app

## 🚀 **Production Checklist**

### **Before Going Live**:
- [ ] HTTPS enabled on domain
- [ ] Camera permissions working
- [ ] QR scanner initializes properly
- [ ] Backend API endpoints accessible
- [ ] Authentication working
- [ ] Error handling implemented
- [ ] Mobile testing completed
- [ ] Browser compatibility verified

## 📞 **Getting Help**

### **If Issues Persist**:
1. **Check Browser Console**: Look for specific error messages
2. **Test Camera Access**: Use the QR Test component
3. **Verify Environment**: Ensure HTTPS/localhost
4. **Try Different Browser**: Test in Chrome/Firefox
5. **Check Device Camera**: Ensure camera works in other apps

### **Debug Commands**:
```javascript
// Test camera support
console.log('getUserMedia supported:', !!navigator.mediaDevices?.getUserMedia);

// Test HTTPS
console.log('HTTPS:', window.location.protocol === 'https:');

// Test localhost
console.log('Localhost:', window.location.hostname === 'localhost');

// List available cameras
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    const cameras = devices.filter(device => device.kind === 'videoinput');
    console.log('Available cameras:', cameras);
  });
```

## 🎯 **Quick Resolution Steps**

1. **Click "QR Test"** in Admin Dashboard
2. **Check browser support** status
3. **Test camera access** with the test button
4. **Review error messages** for specific issues
5. **Follow troubleshooting steps** based on error type
6. **Try different browser** if issues persist
7. **Check HTTPS/localhost** requirement
8. **Verify camera permissions** in browser settings

The QR Test component will help identify the specific issue and provide targeted solutions.
