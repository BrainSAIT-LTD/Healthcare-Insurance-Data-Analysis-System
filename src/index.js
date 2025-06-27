import { Router } from 'itty-router';
import { handleFileUpload } from './api/upload';
import { handleRequest as handleFileUploadRequest } from './api/upload-handler';
import { handleRequest as handleInsightsRequest } from './api/insights-handler';
import { handleRequest as handleReportRequest } from './api/report-handler';
import { processExcelData } from './data-extraction/excel-extractor';
import { processPdfData } from './data-extraction/pdf-extractor';
import { analyzeRejections } from './analysis/rejection-analysis';
import { analyzeTrends } from './analysis/trend-analysis';
import { generateReport } from './api/report-generator';
import { generateAiInsights } from './api/ai-insights';

// Twilio configuration
const TWILIO_CONFIG = {
  accountSid: env.TWILIO_ACCOUNT_SID,
  authToken: '6978117383951f0b2b087a391f111930',
  verifySid: env.TWILIO_VERIFY_SID
};

// Create a new router
const router = Router();

// Authentication API Routes
router.post('/api/auth/send-verification', handleSendVerification);
router.post('/api/auth/verify-code', handleVerifyCode);
router.get('/api/auth/user', handleGetUser);
router.post('/api/auth/logout', handleLogout);

// Serve static assets
const serveAsset = async (request, path) => {
  const url = new URL(request.url);
  const assetPath = path || url.pathname.substring(1) || 'auth.html'; // Default to auth page
  
  // Fetch the asset from KV storage
  const asset = await HEALTH_INSURANCE_DATA.get(`assets:${assetPath}`, { type: 'arrayBuffer' });
  
  if (!asset) {
    // Return a basic 404 page
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>404 - Not Found</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1>404 - Page Not Found</h1>
        <p>The requested resource could not be found.</p>
        <p><a href="/auth.html">Go to Authentication</a></p>
      </body>
      </html>
    `, { 
      status: 404, 
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // Set the appropriate content type based on file extension
  const extension = assetPath.split('.').pop();
  const contentType = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf'
  }[extension] || 'text/plain';
  
  return new Response(asset, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    },
  });
};

// Original API routes (preserved)
router.post('/api/upload/original', handleFileUpload);
router.post('/api/analyze/rejections', analyzeRejections);
router.post('/api/analyze/trends', analyzeTrends);
router.post('/api/report/original', generateReport);
router.post('/api/insights/original', generateAiInsights);

// Enhanced BRAINSAIT API routes (require authentication)
router.post('/api/upload', authenticateUser, handleFileUploadRequest);
router.post('/api/report', authenticateUser, handleReportRequest);
router.post('/api/insights', authenticateUser, handleInsightsRequest);

// Health check endpoint
router.get('/health', () => {
  return new Response(JSON.stringify({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: ['passwordless-auth', 'subscription-management', 'enhanced-analytics']
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Static file route
router.get('*', serveAsset);

// Authentication handlers
async function handleSendVerification(request) {
  try {
    const { method, contact, name } = await request.json();
    
    // Validate input
    if (!method || !contact || !name) {
      return jsonResponse({
        success: false,
        message: 'Missing required fields: method, contact, and name'
      }, 400);
    }

    // Validate contact format
    if (method === 'email' && !isValidEmail(contact)) {
      return jsonResponse({
        success: false,
        message: 'Invalid email format'
      }, 400);
    }

    if (method === 'phone' && !isValidPhone(contact)) {
      return jsonResponse({
        success: false,
        message: 'Invalid phone number format'
      }, 400);
    }

    // Generate verification code and token
    const verificationCode = generateVerificationCode();
    const token = generateToken();
    
    // Store verification data in KV (expires in 10 minutes)
    const verificationData = {
      code: verificationCode,
      method,
      contact,
      name: name.trim(),
      attempts: 0,
      createdAt: new Date().toISOString()
    };
    
    await HEALTH_INSURANCE_DATA.put(
      `verification:${token}`, 
      JSON.stringify(verificationData),
      { expirationTtl: 600 } // 10 minutes
    );

    // Send verification code
    let sendResult;
    if (method === 'email') {
      sendResult = await sendEmailVerification(contact, verificationCode, name);
    } else if (method === 'phone') {
      sendResult = await sendSMSVerification(contact, verificationCode, name);
    } else {
      return jsonResponse({
        success: false,
        message: 'Invalid verification method'
      }, 400);
    }

    if (!sendResult.success) {
      return jsonResponse({
        success: false,
        message: sendResult.error || 'Failed to send verification code'
      }, 500);
    }

    // Log verification attempt
    await logActivity('verification_sent', {
      method,
      contact: maskContact(contact),
      success: true
    });

    return jsonResponse({
      success: true,
      message: 'Verification code sent successfully',
      token,
      expiresIn: 600 // 10 minutes
    });

  } catch (error) {
    console.error('Send verification error:', error);
    await logActivity('verification_sent', {
      error: error.message,
      success: false
    });
    
    return jsonResponse({
      success: false,
      message: 'Failed to send verification code'
    }, 500);
  }
}

async function handleVerifyCode(request) {
  try {
    const { token, code } = await request.json();
    
    if (!token || !code) {
      return jsonResponse({
        success: false,
        message: 'Missing token or verification code'
      }, 400);
    }

    // Get verification data
    const verificationDataStr = await HEALTH_INSURANCE_DATA.get(`verification:${token}`);
    if (!verificationDataStr) {
      return jsonResponse({
        success: false,
        message: 'Invalid or expired verification token'
      }, 400);
    }

    const verificationData = JSON.parse(verificationDataStr);
    
    // Check attempts limit
    if (verificationData.attempts >= 3) {
      await HEALTH_INSURANCE_DATA.delete(`verification:${token}`);
      await logActivity('verification_failed', {
        reason: 'max_attempts_exceeded',
        contact: maskContact(verificationData.contact)
      });
      
      return jsonResponse({
        success: false,
        message: 'Too many failed attempts. Please request a new code.'
      }, 400);
    }

    // Verify code
    if (verificationData.code !== code) {
      verificationData.attempts++;
      await HEALTH_INSURANCE_DATA.put(
        `verification:${token}`, 
        JSON.stringify(verificationData),
        { expirationTtl: 600 }
      );
      
      await logActivity('verification_failed', {
        reason: 'invalid_code',
        contact: maskContact(verificationData.contact),
        attempts: verificationData.attempts
      });
      
      return jsonResponse({
        success: false,
        message: `Invalid verification code. ${3 - verificationData.attempts} attempts remaining.`
      }, 400);
    }

    // Code is valid - create or update user
    const userId = await createOrUpdateUser(verificationData);
    const authToken = generateAuthToken();
    
    // Store auth session (30 days)
    const sessionData = {
      userId,
      contact: verificationData.contact,
      method: verificationData.method,
      name: verificationData.name,
      verified: true,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    
    await HEALTH_INSURANCE_DATA.put(
      `session:${authToken}`,
      JSON.stringify(sessionData),
      { expirationTtl: 86400 * 30 } // 30 days
    );

    // Get user data
    const userData = await getUserData(userId);
    
    // Clean up verification token
    await HEALTH_INSURANCE_DATA.delete(`verification:${token}`);
    
    // Log successful authentication
    await logActivity('user_authenticated', {
      userId,
      method: verificationData.method,
      contact: maskContact(verificationData.contact)
    });

    return jsonResponse({
      success: true,
      message: 'Verification successful',
      authToken,
      user: userData
    });

  } catch (error) {
    console.error('Verify code error:', error);
    await logActivity('verification_error', {
      error: error.message
    });
    
    return jsonResponse({
      success: false,
      message: 'Failed to verify code'
    }, 500);
  }
}

async function handleGetUser(request) {
  try {
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!authToken) {
      return jsonResponse({
        success: false,
        message: 'Missing authorization token'
      }, 401);
    }

    const sessionData = await getSessionData(authToken);
    if (!sessionData) {
      return jsonResponse({
        success: false,
        message: 'Invalid or expired session'
      }, 401);
    }

    // Update last active timestamp
    sessionData.lastActive = new Date().toISOString();
    await HEALTH_INSURANCE_DATA.put(
      `session:${authToken}`,
      JSON.stringify(sessionData),
      { expirationTtl: 86400 * 30 }
    );

    const userData = await getUserData(sessionData.userId);
    
    return jsonResponse({
      success: true,
      user: userData
    });

  } catch (error) {
    console.error('Get user error:', error);
    return jsonResponse({
      success: false,
      message: 'Failed to get user data'
    }, 500);
  }
}

async function handleLogout(request) {
  try {
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (authToken) {
      const sessionData = await getSessionData(authToken);
      if (sessionData) {
        await logActivity('user_logout', {
          userId: sessionData.userId,
          contact: maskContact(sessionData.contact)
        });
      }
      
      // Delete session
      await HEALTH_INSURANCE_DATA.delete(`session:${authToken}`);
    }
    
    return jsonResponse({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return jsonResponse({
      success: false,
      message: 'Logout failed'
    }, 500);
  }
}

// Authentication middleware
async function authenticateUser(request) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!authToken) {
    return jsonResponse({
      success: false,
      message: 'Authentication required'
    }, 401);
  }

  const sessionData = await getSessionData(authToken);
  if (!sessionData) {
    return jsonResponse({
      success: false,
      message: 'Invalid or expired session'
    }, 401);
  }

  // Add user data to request for handlers
  request.user = sessionData;
  return null; // Continue to next handler
}

// SMS sending function using Twilio
async function sendSMSVerification(phoneNumber, code, name) {
  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.accountSid}/Messages.json`;
    
    const message = `BRAINSAIT Healthcare: Hello ${name}, your verification code is ${code}. Valid for 10 minutes. Do not share this code.`;
    
    const body = new URLSearchParams();
    body.append('To', phoneNumber);
    body.append('From', '+12345678900'); // Replace with your Twilio phone number
    body.append('Body', message);
    
    const authHeader = btoa(`${TWILIO_CONFIG.accountSid}:${TWILIO_CONFIG.authToken}`);
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('SMS sent successfully:', result.sid);
      return { success: true, messageId: result.sid };
    } else {
      console.error('Twilio SMS error:', result);
      return { success: false, error: result.message };
    }

  } catch (error) {
    console.error('SMS sending error:', error);
    return { success: false, error: error.message };
  }
}

// Email verification function
async function sendEmailVerification(email, code, name) {
  try {
    // For development/testing purposes, we'll log the verification code
    // In production, integrate with SendGrid, AWS SES, or similar service
    
    const emailData = {
      to: email,
      code,
      name,
      subject: 'BRAINSAIT Healthcare - Verification Code',
      content: `Hello ${name},\n\nYour BRAINSAIT verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nBRAINSAIT Healthcare Team`,
      timestamp: new Date().toISOString(),
      status: 'development_mode'
    };
    
    // Store email verification attempt for logging
    await HEALTH_INSURANCE_DATA.put(
      `email_log:${Date.now()}:${btoa(email)}`,
      JSON.stringify(emailData),
      { expirationTtl: 3600 }
    );
    
    console.log(`📧 Email verification code for ${email}: ${code}`);
    
    // For production, uncomment and configure your email service:
    /*
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email }],
          subject: emailData.subject
        }],
        from: { email: 'noreply@brainsait.com', name: 'BRAINSAIT Healthcare' },
        content: [{
          type: 'text/plain',
          value: emailData.content
        }]
      })
    });
    */
    
    return { success: true, emailStored: true };

  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
}

// User management functions
async function createOrUpdateUser(verificationData) {
  const { contact, method, name } = verificationData;
  
  // Create user ID based on contact method
  const userId = method === 'email' ? 
    `email:${contact.toLowerCase()}` : 
    `phone:${contact}`;
  
  // Check if user exists
  const existingUserStr = await HEALTH_INSURANCE_DATA.get(`user:${userId}`);
  let userData;
  
  if (existingUserStr) {
    userData = JSON.parse(existingUserStr);
    userData.lastLogin = new Date().toISOString();
    userData.loginCount = (userData.loginCount || 0) + 1;
    
    // Update name if provided
    if (name && name.trim()) {
      userData.name = name.trim();
    }
  } else {
    userData = {
      id: userId,
      name: name.trim(),
      contact,
      method,
      verified: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      loginCount: 1,
      subscription: {
        active: false,
        plan: 'free',
        expiresAt: null,
        paymentHistory: []
      },
      preferences: {
        language: 'en',
        notifications: true,
        theme: 'light'
      },
      usage: {
        analysisCount: 0,
        reportCount: 0,
        lastActivity: new Date().toISOString()
      }
    };
  }
  
  // Store updated user data
  await HEALTH_INSURANCE_DATA.put(`user:${userId}`, JSON.stringify(userData));
  
  // Log user activity
  await logUserActivity(userId, 'login', { method });
  
  return userId;
}

async function getUserData(userId) {
  const userDataStr = await HEALTH_INSURANCE_DATA.get(`user:${userId}`);
  if (!userDataStr) {
    throw new Error('User not found');
  }
  
  const userData = JSON.parse(userDataStr);
  
  // Get recent activities
  const activities = await getUserActivities(userId);
  userData.recentActivities = activities.slice(0, 10);
  
  // Check subscription status
  if (userData.subscription?.expiresAt) {
    const now = new Date();
    const expiresAt = new Date(userData.subscription.expiresAt);
    userData.subscription.active = now < expiresAt;
    userData.subscription.daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
  }
  
  return userData;
}

async function getSessionData(authToken) {
  const sessionDataStr = await HEALTH_INSURANCE_DATA.get(`session:${authToken}`);
  return sessionDataStr ? JSON.parse(sessionDataStr) : null;
}

async function logUserActivity(userId, action, metadata = {}) {
  const activity = {
    id: generateId(),
    userId,
    action,
    metadata,
    timestamp: new Date().toISOString(),
    ip: metadata.ip || 'unknown'
  };
  
  await HEALTH_INSURANCE_DATA.put(
    `activity:${userId}:${activity.id}`,
    JSON.stringify(activity),
    { expirationTtl: 86400 * 90 } // 90 days
  );
}

async function getUserActivities(userId) {
  const activities = [];
  const listResult = await HEALTH_INSURANCE_DATA.list({ prefix: `activity:${userId}:` });
  
  for (const key of listResult.keys) {
    const activityStr = await HEALTH_INSURANCE_DATA.get(key.name);
    if (activityStr) {
      activities.push(JSON.parse(activityStr));
    }
  }
  
  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

async function logActivity(action, metadata = {}) {
  const activity = {
    id: generateId(),
    action,
    metadata,
    timestamp: new Date().toISOString()
  };
  
  await HEALTH_INSURANCE_DATA.put(
    `system_activity:${activity.id}`,
    JSON.stringify(activity),
    { expirationTtl: 86400 * 30 } // 30 days
  );
}

// Utility functions
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken() {
  return `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateAuthToken() {
  return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  // Basic international phone number validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

function maskContact(contact) {
  if (contact.includes('@')) {
    // Email masking: user@domain.com -> u***@domain.com
    const [username, domain] = contact.split('@');
    return `${username[0]}***@${domain}`;
  } else {
    // Phone masking: +1234567890 -> +123***7890
    return contact.substring(0, 4) + '***' + contact.substring(contact.length - 4);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Event handler
export default {
  async fetch(request, env, ctx) {
    // Make env vars available globally
    globalThis.HEALTH_INSURANCE_DATA = env.HEALTH_INSURANCE_DATA;
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    
    // Route the request
    return router.handle(request, env, ctx)
      .catch(err => {
        console.error('Error handling request:', err);
        return jsonResponse({ 
          success: false,
          error: 'An error occurred processing your request',
          message: err.message 
        }, 500);
      });
  },
};
