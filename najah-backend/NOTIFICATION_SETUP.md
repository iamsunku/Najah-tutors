# Notification System Setup Guide

This guide explains how to set up Email, WhatsApp Business, and Push Notifications for the Najah Tutors platform.

## 📧 Email Notifications

Email notifications use Nodemailer with SMTP. Configuration is already in place.

### Required Environment Variables:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Gmail Setup:
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the generated app password as `SMTP_PASS`

---

## 📱 WhatsApp Business Notifications

WhatsApp notifications use Twilio's WhatsApp Business API.

### Step 1: Create Twilio Account
1. Sign up at https://www.twilio.com/
2. Get your Account SID and Auth Token from the dashboard

### Step 2: Set Up WhatsApp Sandbox (for testing)
1. Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message
2. Follow instructions to join the sandbox (send code to Twilio number)
3. Note your sandbox WhatsApp number (format: `whatsapp:+14155238886`)

### Step 3: Production Setup (Optional)
For production, you need:
- A Twilio WhatsApp Business Account
- Approved WhatsApp Business Profile
- Verified phone number

### Required Environment Variables:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

## 🔔 Push Notifications (Web Push)

Push notifications use the Web Push API with VAPID keys.

### Step 1: Generate VAPID Keys

Install web-push globally (if not already installed):
```bash
npm install -g web-push
```

Generate VAPID keys:
```bash
web-push generate-vapid-keys
```

This will output:
```
Public Key: <your-public-key>
Private Key: <your-private-key>
```

### Step 2: Configure Environment Variables
```env
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_SUBJECT=mailto:noreply@najahtutors.com
```

**Important:** The `VAPID_SUBJECT` should be a mailto: link or a URL to your website.

### Step 3: Install Dependencies
```bash
cd najah-backend
npm install
```

This will install:
- `web-push` - For push notification server
- `twilio` - For WhatsApp Business API

---

## 🚀 Usage

### Automatic Notifications

Notifications are automatically sent when:
1. **Live Class Created**: All enrolled students receive notifications
2. **Live Class Updated**: Students are notified of changes
3. **Live Class Cancelled**: Cancellation notifications sent
4. **Student Enrolls**: Student receives welcome notification

### Manual Notification Sending

#### Send notification for a specific class:
```bash
POST /api/notifications/class/:classId
Authorization: Bearer <admin-token>
```

#### Test notifications:
```bash
POST /api/notifications/test
Authorization: Bearer <user-token>
```

### Frontend Integration

1. Include the push notification script in your HTML:
```html
<script src="/push-notifications.js"></script>
```

2. Include the service worker in your HTML:
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

3. Enable notifications for a user:
```javascript
// Subscribe to push notifications
await pushNotificationService.subscribe();

// Check subscription status
const isSubscribed = await pushNotificationService.isSubscribed();

// Update preferences
await pushNotificationService.updatePreferences({
  email: true,
  whatsapp: true,
  push: true
});
```

---

## 📋 Complete .env Example

```env
# Database
MONGODB_URI=mongodb://localhost:27017/najah

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRE=30d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_SUBJECT=mailto:noreply@najahtutors.com

# Server
PORT=5000
NODE_ENV=development
```

---

## ✅ Testing

### Test Email Notifications:
1. Create a live class in admin dashboard
2. Enroll a student
3. Check student's email inbox

### Test WhatsApp Notifications:
1. Ensure Twilio is configured
2. Create a live class
3. Check student's WhatsApp

### Test Push Notifications:
1. Ensure VAPID keys are configured
2. Open student dashboard in browser
3. Allow notification permission when prompted
4. Create a live class
5. Check browser notifications

---

## 🔧 Troubleshooting

### Email Not Working:
- Check SMTP credentials
- Verify app password is correct (for Gmail)
- Check spam folder

### WhatsApp Not Working:
- Verify Twilio credentials
- Check if phone number is in correct format (with country code)
- Ensure WhatsApp sandbox is set up (for testing)

### Push Notifications Not Working:
- Verify VAPID keys are correct
- Check browser console for errors
- Ensure HTTPS is used (required for push notifications)
- Verify service worker is registered

---

## 📝 Notes

- **Email**: Works immediately after SMTP configuration
- **WhatsApp**: Requires Twilio account (free tier available for testing)
- **Push**: Requires HTTPS in production (localhost works for development)
- All notifications respect user preferences (can be disabled per channel)
- Notifications are sent asynchronously (non-blocking)

---

## 🔐 Security

- Never commit `.env` file to version control
- Keep VAPID private key secure
- Keep Twilio auth token secure
- Use environment variables for all sensitive data

