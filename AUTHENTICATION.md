# BRAINSAIT Passwordless Authentication System

## Overview

The BRAINSAIT Healthcare Insurance Data Analysis System now features a state-of-the-art passwordless authentication system that provides secure, user-friendly access without the need for traditional passwords.

## 🔐 Authentication Features

### Core Capabilities
- **Passwordless Authentication**: No passwords to remember or manage
- **Multi-Channel Verification**: Support for both email and SMS verification
- **International Phone Support**: Works with phone numbers from multiple countries
- **Session Management**: Secure, long-lasting sessions with automatic renewal
- **Development Mode**: Easy testing with auto-fill and console logging

### Security Features
- **Token-Based Authentication**: Secure JWT-like tokens for session management
- **Rate Limiting**: Protection against verification code abuse
- **Attempt Limiting**: Maximum 3 verification attempts per code
- **Secure Storage**: User data encrypted in Cloudflare KV
- **Activity Logging**: Complete audit trail of user activities

## 🚀 API Endpoints

### Authentication Endpoints

#### Send Verification Code
```http
POST /api/auth/send-verification
Content-Type: application/json

{
  "method": "email|phone",
  "contact": "user@example.com | +966501234567",
  "name": "User Full Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "token": "verify_1640995200000_abc123def",
  "expiresIn": 600
}
```

#### Verify Code
```http
POST /api/auth/verify-code
Content-Type: application/json

{
  "token": "verify_1640995200000_abc123def",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification successful",
  "authToken": "auth_1640995200000_xyz789abc",
  "user": {
    "id": "email:user@example.com",
    "name": "User Full Name",
    "contact": "user@example.com",
    "method": "email",
    "verified": true,
    "subscription": {
      "active": false,
      "plan": "free"
    }
  }
}
```

#### Get User Info
```http
GET /api/auth/user
Authorization: Bearer auth_1640995200000_xyz789abc
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "email:user@example.com",
    "name": "User Full Name",
    "loginCount": 5,
    "lastLogin": "2025-06-27T10:30:00.000Z",
    "recentActivities": [...]
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer auth_1640995200000_xyz789abc
```

## 🔧 Implementation Details

### Frontend Integration

#### JavaScript Authentication Helper
```javascript
class BrainSAITAuth {
  constructor(apiUrl = '') {
    this.apiUrl = apiUrl;
    this.authToken = localStorage.getItem('brainsait_auth_token');
  }

  async sendVerificationCode(method, contact, name) {
    const response = await fetch(`${this.apiUrl}/api/auth/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, contact, name })
    });
    return response.json();
  }

  async verifyCode(token, code) {
    const response = await fetch(`${this.apiUrl}/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, code })
    });
    
    const result = await response.json();
    if (result.success) {
      localStorage.setItem('brainsait_auth_token', result.authToken);
      localStorage.setItem('brainsait_user', JSON.stringify(result.user));
      this.authToken = result.authToken;
    }
    return result;
  }

  async getCurrentUser() {
    if (!this.authToken) return null;
    
    const response = await fetch(`${this.apiUrl}/api/auth/user`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });
    
    if (response.ok) {
      const result = await response.json();
      return result.user;
    }
    return null;
  }

  async logout() {
    if (this.authToken) {
      await fetch(`${this.apiUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });
    }
    
    localStorage.removeItem('brainsait_auth_token');
    localStorage.removeItem('brainsait_user');
    this.authToken = null;
  }

  isAuthenticated() {
    return !!this.authToken;
  }
}

// Usage example
const auth = new BrainSAITAuth();

// Send verification code
const result = await auth.sendVerificationCode('email', 'user@example.com', 'John Doe');
if (result.success) {
  // Show verification code input
  const verifyResult = await auth.verifyCode(result.token, '123456');
  if (verifyResult.success) {
    // User is authenticated
    console.log('Welcome,', verifyResult.user.name);
  }
}
```

### Backend Data Structures

#### User Object
```javascript
{
  id: "email:user@example.com" | "phone:+966501234567",
  name: "Full Name",
  contact: "user@example.com" | "+966501234567",
  method: "email" | "phone",
  verified: true,
  createdAt: "2025-06-27T10:00:00.000Z",
  lastLogin: "2025-06-27T10:30:00.000Z",
  loginCount: 5,
  subscription: {
    active: false,
    plan: "free",
    expiresAt: null,
    paymentHistory: []
  },
  preferences: {
    language: "en",
    notifications: true,
    theme: "light"
  },
  usage: {
    analysisCount: 0,
    reportCount: 0,
    lastActivity: "2025-06-27T10:30:00.000Z"
  }
}
```

#### Session Object
```javascript
{
  userId: "email:user@example.com",
  contact: "user@example.com",
  method: "email",
  name: "Full Name",
  verified: true,
  createdAt: "2025-06-27T10:00:00.000Z",
  lastActive: "2025-06-27T10:30:00.000Z"
}
```

## 🌍 Internationalization Support

### Supported Countries for SMS
- 🇸🇦 Saudi Arabia (+966)
- 🇺🇸 United States (+1)
- 🇬🇧 United Kingdom (+44)
- 🇦🇪 United Arab Emirates (+971)
- 🇰🇼 Kuwait (+965)
- 🇧🇭 Bahrain (+973)
- 🇶🇦 Qatar (+974)

### Phone Number Validation
- **Saudi Arabia**: 9 digits starting with 5 (e.g., 501234567)
- **International**: 7-15 digits for other countries

## 🔧 Configuration

### Environment Variables
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_VERIFY_SID=YOUR_TWILIO_VERIFY_SERVICE_SID

# Application Settings
APP_VERSION=2.0.0
DEVELOPMENT_MODE=true
```

### Secrets (via Wrangler)
```bash
# Required for SMS verification
wrangler secret put TWILIO_AUTH_TOKEN

# Optional for email verification
wrangler secret put SENDGRID_API_KEY
```

### Twilio Setup
1. **Create Twilio Account**: Sign up at https://www.twilio.com
2. **Get Credentials**: Find your Account SID and Auth Token
3. **Buy Phone Number**: Purchase a phone number for SMS sending
4. **Update Configuration**: Replace `+12345678900` in `src/index.js` with your Twilio number

### Email Service Setup (Optional)
For production email verification, configure SendGrid:

1. **Create SendGrid Account**: Sign up at https://sendgrid.com
2. **Generate API Key**: Create an API key with mail send permissions
3. **Configure Sender**: Verify your sender email/domain
4. **Update Code**: Uncomment email sending code in `src/index.js`

## 🛡️ Security Best Practices

### Token Security
- **Short-lived verification tokens**: 10 minutes expiration
- **Long-lived auth tokens**: 30 days with automatic renewal
- **Secure storage**: All sensitive data encrypted in KV
- **No sensitive data in localStorage**: Only store tokens, not user data

### Rate Limiting
- **Verification attempts**: Maximum 3 attempts per verification token
- **Resend cooldown**: 60 seconds between verification code requests
- **Session validation**: Automatic token refresh on API calls

### Data Protection
- **Contact masking**: Email/phone numbers masked in logs
- **Activity logging**: Complete audit trail without sensitive data
- **Automatic cleanup**: Expired tokens automatically removed

## 🧪 Development & Testing

### Development Mode Features
- **Auto-fill forms**: Click development indicator to fill test data
- **Console logging**: Verification codes logged to browser console
- **Fallback authentication**: Works offline for testing
- **Mock responses**: Simulated API responses when backend unavailable

### Testing Checklist
```bash
# 1. Test email verification
curl -X POST http://localhost:8787/api/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"method":"email","contact":"test@example.com","name":"Test User"}'

# 2. Test phone verification
curl -X POST http://localhost:8787/api/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"method":"phone","contact":"+966501234567","name":"Test User"}'

# 3. Test user retrieval
curl -X GET http://localhost:8787/api/auth/user \
  -H "Authorization: Bearer your_auth_token"
```

## 🚀 Deployment

### Quick Deployment
```bash
# Install dependencies
npm install

# Run deployment script
chmod +x deploy.sh
./deploy.sh
```

### Manual Deployment Steps
```bash
# 1. Set up KV namespace
npx wrangler kv:namespace create "HEALTH_INSURANCE_DATA"

# 2. Configure secrets
npx wrangler secret put TWILIO_AUTH_TOKEN

# 3. Upload static files
npx wrangler kv:key put --binding=HEALTH_INSURANCE_DATA "assets:auth.html" --path="public/auth.html"

# 4. Deploy worker
npx wrangler deploy
```

## 📊 Monitoring & Analytics

### User Activity Tracking
The system automatically tracks:
- **Login events**: Timestamp and method used
- **Verification attempts**: Success/failure rates
- **Session duration**: How long users stay active
- **Feature usage**: Which parts of the system are used most

### Error Monitoring
- **Failed verifications**: Track and alert on high failure rates
- **API errors**: Monitor endpoint response times and error rates
- **Twilio status**: Track SMS delivery success rates

## 🔗 Integration Examples

### React Integration
```javascript
import { useEffect, useState } from 'react';

function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = new BrainSAITAuth();
    
    auth.getCurrentUser().then(userData => {
      setUser(userData);
      setLoading(false);
    });
  }, []);

  const login = async (method, contact, name) => {
    const auth = new BrainSAITAuth();
    return auth.sendVerificationCode(method, contact, name);
  };

  const verify = async (token, code) => {
    const auth = new BrainSAITAuth();
    const result = await auth.verifyCode(token, code);
    if (result.success) {
      setUser(result.user);
    }
    return result;
  };

  const logout = async () => {
    const auth = new BrainSAITAuth();
    await auth.logout();
    setUser(null);
  };

  return { user, loading, login, verify, logout };
}
```

### Vue.js Integration
```javascript
// composables/useAuth.js
import { ref, onMounted } from 'vue';

export function useAuth() {
  const user = ref(null);
  const isAuthenticated = ref(false);

  const auth = new BrainSAITAuth();

  onMounted(async () => {
    const userData = await auth.getCurrentUser();
    if (userData) {
      user.value = userData;
      isAuthenticated.value = true;
    }
  });

  const sendCode = (method, contact, name) => {
    return auth.sendVerificationCode(method, contact, name);
  };

  const verifyCode = async (token, code) => {
    const result = await auth.verifyCode(token, code);
    if (result.success) {
      user.value = result.user;
      isAuthenticated.value = true;
    }
    return result;
  };

  return {
    user: readonly(user),
    isAuthenticated: readonly(isAuthenticated),
    sendCode,
    verifyCode
  };
}
```

## 🆘 Troubleshooting

### Common Issues

#### 1. SMS Not Sending
```bash
# Check Twilio credentials
npx wrangler secret list | grep TWILIO

# Test Twilio API directly
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/YOUR_SID/Messages.json" \
  --data-urlencode "To=+966501234567" \
  --data-urlencode "From=+12345678900" \
  --data-urlencode "Body=Test message" \
  -u YOUR_SID:YOUR_AUTH_TOKEN
```

#### 2. Email Not Sending
- Check console logs for verification codes in development mode
- Verify SendGrid configuration if using production email
- Ensure email service code is uncommented in `src/index.js`

#### 3. Authentication Failures
```javascript
// Check token in browser console
console.log(localStorage.getItem('brainsait_auth_token'));

// Verify token format
// Should start with 'auth_' followed by timestamp and random string
```

#### 4. KV Storage Issues
```bash
# List all keys in KV namespace
npx wrangler kv:key list --binding=HEALTH_INSURANCE_DATA

# Check specific user data
npx wrangler kv:key get --binding=HEALTH_INSURANCE_DATA "user:email:test@example.com"
```

### Debug Mode
Enable debug logging by adding to URL: `?debug=true`

### Support Contacts
- **Technical Issues**: development@brainsait.com
- **Twilio Support**: https://support.twilio.com
- **Cloudflare Support**: https://support.cloudflare.com

---

## 📋 Changelog

### Version 2.0.0 (Current)
- ✅ Complete passwordless authentication system
- ✅ Multi-channel verification (Email + SMS)
- ✅ International phone number support
- ✅ Session management with auto-renewal
- ✅ Development mode with testing utilities
- ✅ Comprehensive activity logging
- ✅ Integration with subscription system

### Version 1.0.0
- ✅ Basic data analysis features
- ✅ File upload and processing
- ✅ Report generation
- ✅ AI insights

---

*For more information, visit the [BRAINSAIT Healthcare Documentation](./README.md)*
