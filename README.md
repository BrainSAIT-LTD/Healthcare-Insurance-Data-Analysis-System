# Healthcare Insurance Data Analysis System - BRAINSAIT Enhanced

A modern, powerful system for analyzing healthcare insurance data from Excel and PDF files. This system extracts, processes, and analyzes insurance claims data to identify trends, patterns, rejection rates, and provides actionable insights. 

The system features the BRAINSAIT enhanced interface - a modern, visually rich dashboard with advanced AI-powered analytics. Optimized for deployment on Cloudflare Workers.

## Features

### Core Features
- **Data Extraction**: Import data from Excel files and tables from PDFs
- **Data Processing**: Clean and transform data for analysis
- **Rejection Analysis**: Analyze claim rejection patterns and trends
- **Trend Analysis**: Identify monthly and quarterly trends in claims
- **Report Generation**: Generate reports in multiple formats (JSON, CSV, Excel, PDF)
- **Cloudflare Workers Compatible**: Optimized for edge deployment with minimal resource usage

### BRAINSAIT Enhanced Features
- **Modern Dark-Mode UI**: Sleek, modern dark-themed interface for better visualization
- **Advanced Visualizations**: Responsive, interactive charts using Chart.js
- **Enhanced File Upload**: Drag-and-drop file upload with progress tracking
- **AI-Powered Insights**: OpenAI-powered analysis and recommendations
- **Tabbed Navigation**: Easy access to different sections of the application
- **Multi-format Reports**: Generate reports in various formats with customizable sections
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## JavaScript Implementation (Recommended)

The JavaScript implementation is optimized for deployment on Cloudflare Workers, providing fast, scalable performance.

### Installation

```bash
# Clone the repository
git clone https://github.com/BrainSAIT-LTD/Healthcare-Insurance-Data-Analysis-System.git
cd Healthcare-Insurance-Data-Analysis-System

# Install dependencies
npm install
```

### Development

```bash
# Install Wrangler CLI globally (if not already installed)
npm install -g wrangler

# Start local development server
npm run dev
```

Once the development server is running, you can access:
- Standard interface: `http://localhost:8787/index.html`
- BRAINSAIT interface: `http://localhost:8787/brainsait-integrated.html`

### Deployment to Cloudflare Workers

1. Login to Cloudflare
```bash
wrangler login
```

2. Update your KV namespace ID in `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "HEALTH_INSURANCE_DATA"
id = "your-kv-namespace-id"
```

3. Deploy to Cloudflare Workers
```bash
npm run deploy
```

## User Interfaces

The application offers two user interfaces:

1. **Standard Interface**: Available at `/index.html` - The original interface with basic functionality (free)
2. **BRAINSAIT Enhanced Interface**: Available at `/brainsait-integrated.html` - Advanced interface with modern design and enhanced features (premium subscription required)

## 🔐 Authentication System

The platform now features a **passwordless authentication system** for secure access:

### Authentication Methods

- **Email Verification**: Users receive 6-digit codes via email
- **SMS Verification**: Users receive codes via SMS (powered by Twilio)
- **International Support**: Supports global phone numbers with country codes
- **Saudi Arabia Focus**: Special validation for Saudi phone numbers (+966)

### Security Features

- ✅ **Passwordless**: No passwords to remember or compromise
- ✅ **Rate Limited**: Maximum 3 attempts per verification token
- ✅ **Session Management**: Secure 30-day sessions with auto-renewal
- ✅ **Token Expiration**: Verification codes expire in 10 minutes
- ✅ **Activity Logging**: Complete audit trail of user actions

### Setup Instructions

1. **Configure Twilio** (for SMS verification):

   ```bash
   # Set your Twilio credentials
   wrangler secret put TWILIO_AUTH_TOKEN
   ```

2. **Deploy with Authentication**:

   ```bash
   # Use the deployment script
   ./deploy.sh
   ```

3. **Test the System**:
   - Visit your Worker URL (defaults to auth page)
   - Try email verification (development mode logs codes)
   - Try SMS verification with real phone numbers

For detailed authentication documentation, see [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md).

### Subscription Model

The BRAINSAIT Enhanced Interface is available through a premium subscription:

#### Pricing & Payment

- **Price**: $49.99 per month
- **Payment Methods**: PayPal, Apple Pay, Mada, STC Pay, Visa/Mastercard
- **Billing Cycle**: 30 days
- **Renewal**: Manual renewal through payment page

#### Premium Features
- **Modern UI**: Dark-mode interface with enhanced usability
- **Advanced Visualizations**: Interactive, responsive charts and graphs
- **AI-Powered Analysis**: Get intelligent insights with OpenAI integration
- **Enhanced File Support**: Upload larger files (up to 10MB)
- **Multi-format Reports**: Generate comprehensive reports in various formats
- **Priority Support**: Access to priority technical support

#### Subscription Management
- **Usage Tracking**: Visual indicator showing subscription status
- **Expiry Notification**: Alerts as subscription expiration approaches
- **Extension Options**: Add 30 days to existing subscription when renewing
- **Payment History**: Tracking of payments and subscription periods

## API Documentation

### Endpoints

- `POST /api/upload`: Upload Excel or PDF files for analysis (Supports both interfaces)
- `POST /api/analyze/rejections`: Analyze claim rejection patterns
- `POST /api/analyze/trends`: Analyze claim trends over time
- `POST /api/report`: Generate downloadable reports in multiple formats
- `POST /api/insights`: Generate AI-powered insights (requires OpenAI API key)

### BRAINSAIT API Features

- File uploads are processed in real-time with progress tracking
- Advanced error handling and validation
- Support for larger files (up to 10MB)
- Multiple file format support (PDF, Excel, CSV)
- Enhanced security with proper validation

## License

This project is licensed under the GNU General Public License v3.0 - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
