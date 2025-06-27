# Passwordless Authentication System

This document provides detailed information about the passwordless authentication system integrated into the Healthcare Insurance Data Analysis System.

## Overview

The authentication system provides secure, passwordless access using:
- **Email verification** - Users receive verification codes via email
- **SMS verification** - Users receive verification codes via SMS (powered by Twilio)
- **JWT-based sessions** - Secure session management with Cloudflare KV storage
- **Subscription integration** - Seamless integration with payment and subscription system

## Features

### 🔐 Authentication Methods
- **Email + Verification Code**: Users enter email and receive 6-digit code
- **Phone + Verification Code**: Users enter phone number and receive SMS code
- **International Support**: Phone verification supports international numbers
- **Saudi Arabia Focus**: Special validation for Saudi phone numbers (+966)

### 🛡️ Security Features
- **Rate Limiting**: Maximum 3 verification attempts per token
- **Token Expiration**: Verification tokens expire in 10 minutes
- **Session Management**: Long-lived sessions (30 days) with automatic renewal
- **Input Validation**: Email format and phone number validation
- **CORS Protection**: Proper CORS headers for API security

### 🎯 User Experience
- **3-Step Process**: Contact Info → Verification → Success
- **Auto-advancing Code Input**: Seamless 6-digit code entry
- **Paste Support**: Users can paste verification codes
- **Visual Feedback**: Progress indicators and loading states
- **Error Handling**: Clear error messages and retry options

## API Endpoints

### Authentication Endpoints

#### Send Verification Code
```bash
POST /api/auth/send-verification
Content-Type: application/json

{
  "method": "email|phone",
  "contact": "user@example.com|+966501234567",
  "name": "User Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "token": "verify_1234567890_abcdef123",
  "expiresIn": 600
}
```

#### Verify Code
```bash
POST /api/auth/verify-code
Content-Type: application/json

{
  "token": "verify_1234567890_abcdef123",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification successful",
  "authToken": "auth_1234567890_abcdef123456",
  "user": {
    "id": "email:user@example.com",
    "name": "User Name",
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
```bash
GET /api/auth/user
Authorization: Bearer auth_1234567890_abcdef123456
```

#### Logout
```bash
POST /api/auth/logout
Authorization: Bearer auth_1234567890_abcdef123456
```

## Integration Guide

### Frontend Integration

1. **Authentication Check**:
```javascript
// Check if user is already authenticated
const authToken = localStorage.getItem('brainsait_auth_token');
if (authToken) {
  // Verify token with server
  fetch('/api/auth/user', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // User is authenticated
      redirectToPlatform();
    } else {
      // Invalid token, show auth form
      showAuthenticationForm();
    }
  });
}
```

2. **Protected API Calls**:
```javascript
// Make authenticated API calls
function callProtectedAPI(endpoint, data) {
  const authToken = localStorage.getItem('brainsait_auth_token');
  
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(data)
  });
}
```

### Backend Integration

1. **Middleware Usage**:
```javascript
// Protected routes automatically use authentication middleware
router.post('/api/upload', authenticateUser, handleFileUploadRequest);
router.post('/api/report', authenticateUser, handleReportRequest);
router.post('/api/insights', authenticateUser, handleInsightsRequest);
```

2. **Access User Data**:
```javascript
// In your handler functions
function handleFileUploadRequest(request) {
  const user = request.user; // Automatically populated by middleware
  console.log('User:', user.name, user.contact);
  
  // Update user activity
  await logUserActivity(user.userId, 'file_upload', {
    fileName: uploadedFile.name
  });
}
```

## Configuration

### Environment Variables

Set these in your `wrangler.toml`:

```toml
[vars]
TWILIO_ACCOUNT_SID = "YOUR_TWILIO_ACCOUNT_SID"
TWILIO_VERIFY_SID = "YOUR_TWILIO_VERIFY_SERVICE_SID"
APP_VERSION = "2.0.0"
DEVELOPMENT_MODE = "true"
```

### Secrets

Set these using `wrangler secret put`:

```bash
# Required for SMS verification
wrangler secret put TWILIO_AUTH_TOKEN

# Optional for email verification
wrangler secret put SENDGRID_API_KEY
```

### Twilio Setup

1. **Create Twilio Account**: Sign up at [twilio.com](https://www.twilio.com)
2. **Get Phone Number**: Purchase a phone number for SMS sending
3. **Create Verify Service**: Set up Twilio Verify for code generation
4. **Update Configuration**: Add your credentials to the worker

### Email Setup (Optional)

For production email verification, integrate with:
- **SendGrid**: Professional email service
- **AWS SES**: Amazon Simple Email Service
- **Mailgun**: Email API service

## Development Mode

### Features
- **Auto-fill Forms**: Click the development indicator to auto-fill test data
- **Console Logging**: Verification codes are logged to console
- **Fallback Authentication**: Works offline for testing
- **Mock Data**: Generates realistic test user data

### Enable Development Mode
Development mode is automatically enabled when:
- Running on `localhost`
- Running on `127.0.0.1`
- Running on `*.workers.dev` domains
- URL contains `?dev=true`

### Test Data
```javascript
const testUsers = {
  email: {
    contact: 'user@example.com',
    name: 'Test User',
    code: '123456'
  },
  phone: {
    contact: '+966501234567',
    name: 'Test User',
    code: '123456'
  }
};
```

## Data Storage

### User Data Structure
```json
{
  "id": "email:user@example.com",
  "name": "User Name",
  "contact": "user@example.com",
  "method": "email",
  "verified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastLogin": "2024-01-01T00:00:00.000Z",
  "loginCount": 1,
  "subscription": {
    "active": false,
    "plan": "free",
    "expiresAt": null,
    "paymentHistory": []
  },
  "preferences": {
    "language": "en",
    "notifications": true,
    "theme": "light"
  },
  "usage": {
    "analysisCount": 0,
    "reportCount": 0,
    "lastActivity": "2024-01-01T00:00:00.000Z"
  }
}
```

### Session Data Structure
```json
{
  "userId": "email:user@example.com",
  "contact": "user@example.com",
  "method": "email",
  "name": "User Name",
  "verified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastActive": "2024-01-01T00:00:00.000Z"
}
```

## Security Considerations

### Best Practices
1. **Token Security**: Store auth tokens securely in localStorage
2. **HTTPS Only**: Always use HTTPS in production
3. **Rate Limiting**: Implement rate limiting for verification attempts
4. **Input Validation**: Validate all user inputs on both client and server
5. **Session Expiry**: Implement reasonable session expiration times

### Monitoring
- **Failed Login Attempts**: Monitor and alert on excessive failures
- **Token Usage**: Track token usage patterns
- **User Activity**: Log user actions for security auditing

## Troubleshooting

### Common Issues

1. **SMS Not Received**:
   - Check phone number format (+country code)
   - Verify Twilio credentials
   - Check Twilio account balance
   - Ensure phone number is not blocked

2. **Email Not Received**:
   - Check spam/junk folder
   - Verify email service configuration
   - Check email service quotas
   - Ensure sender reputation

3. **Authentication Fails**:
   - Check browser console for errors
   - Verify API endpoints are accessible
   - Check network connectivity
   - Ensure KV namespace is properly configured

### Debug Commands

```bash
# View Worker logs
wrangler tail

# Check KV storage
wrangler kv:key list --binding=HEALTH_INSURANCE_DATA

# Test API endpoints
curl -X POST https://your-worker.workers.dev/api/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"method":"email","contact":"test@example.com","name":"Test User"}'
```

## Performance Optimization

### Recommendations
1. **KV Storage**: Use appropriate TTL values for different data types
2. **Caching**: Cache user data appropriately to reduce KV reads
3. **Connection Pooling**: Reuse connections for external API calls
4. **Error Handling**: Implement proper error handling and retries

### Monitoring Metrics
- **Response Times**: Monitor API response times
- **Success Rates**: Track authentication success rates
- **User Activity**: Monitor user engagement patterns
- **Resource Usage**: Track KV storage and CPU usage

## Future Enhancements

### Planned Features
1. **Multi-factor Authentication**: Add optional 2FA
2. **Social Login**: Integration with Google, Facebook, etc.
3. **Biometric Authentication**: Support for fingerprint/face recognition
4. **Advanced Analytics**: Detailed user behavior tracking
5. **Admin Dashboard**: User management interface

### API Improvements
1. **GraphQL Support**: Alternative to REST API
2. **Webhook Support**: Real-time event notifications
3. **Batch Operations**: Bulk user management operations
4. **Advanced Filtering**: Complex user queries

## Support

For technical support or questions about the authentication system:

1. **Check Documentation**: Review this guide and API documentation
2. **Debug Logs**: Use browser developer tools and Worker logs
3. **Test Environment**: Use development mode for testing
4. **Contact Support**: Reach out to the development team

---

*This authentication system is designed to provide secure, user-friendly access to the Healthcare Insurance Data Analysis System while maintaining high security standards and excellent user experience.*
