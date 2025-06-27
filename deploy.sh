#!/bin/bash
# Healthcare Insurance Data Analysis System - Deployment Script
# This script sets up the passwordless authentication system

echo "🚀 Deploying Healthcare Insurance Data Analysis System with Passwordless Authentication"
echo "=================================================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "🔑 Please log in to Cloudflare:"
    wrangler login
fi

echo "📋 Setting up environment..."

# Create KV namespace if it doesn't exist
echo "🗄️ Setting up KV namespace..."
KV_ID=$(wrangler kv:namespace create "HEALTH_INSURANCE_DATA" 2>/dev/null | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
if [ ! -z "$KV_ID" ]; then
    echo "✅ KV namespace created: $KV_ID"
    # Update wrangler.toml with the new ID
    sed -i "s/id = \"[^\"]*\"/id = \"$KV_ID\"/" wrangler.toml
fi

# Set up Twilio secrets
echo "🔐 Setting up Twilio authentication..."
read -p "Enter your Twilio Auth Token: " -s TWILIO_AUTH_TOKEN
echo
wrangler secret put TWILIO_AUTH_TOKEN <<< "$TWILIO_AUTH_TOKEN"

# Optional: Set up SendGrid for email
read -p "Do you want to set up SendGrid for email verification? (y/n): " SETUP_SENDGRID
if [ "$SETUP_SENDGRID" = "y" ]; then
    read -p "Enter your SendGrid API Key: " -s SENDGRID_API_KEY
    echo
    wrangler secret put SENDGRID_API_KEY <<< "$SENDGRID_API_KEY"
fi

# Upload static files to KV
echo "📁 Uploading static files..."
upload_to_kv() {
    local file_path="$1"
    local kv_key="assets:$2"
    
    if [ -f "$file_path" ]; then
        wrangler kv:key put --binding=HEALTH_INSURANCE_DATA "$kv_key" --path="$file_path" --metadata='{"contentType":"'$(file -b --mime-type "$file_path")'"}'
        echo "✅ Uploaded: $2"
    else
        echo "⚠️ File not found: $file_path"
    fi
}

# Upload HTML files
upload_to_kv "public/auth.html" "auth.html"
upload_to_kv "public/welcome.html" "welcome.html"
upload_to_kv "public/payment.html" "payment.html"
upload_to_kv "public/subscription.html" "subscription.html"
upload_to_kv "public/brainsait-integrated.html" "brainsait-integrated.html"
upload_to_kv "public/index.html" "index.html"

# Upload JavaScript files
if [ -d "public/js" ]; then
    for js_file in public/js/*.js; do
        if [ -f "$js_file" ]; then
            filename=$(basename "$js_file")
            upload_to_kv "$js_file" "js/$filename"
        fi
    done
fi

# Upload CSS files (if any)
if [ -d "public/css" ]; then
    for css_file in public/css/*.css; do
        if [ -f "$css_file" ]; then
            filename=$(basename "$css_file")
            upload_to_kv "$css_file" "css/$filename"
        fi
    done
fi

# Deploy the Worker
echo "🚀 Deploying Worker..."
wrangler deploy

# Test deployment
echo "🧪 Testing deployment..."
WORKER_URL=$(wrangler whoami 2>/dev/null | grep -o 'https://[^"]*workers.dev' | head -1)
if [ ! -z "$WORKER_URL" ]; then
    echo "Testing health endpoint..."
    curl -s "$WORKER_URL/health" | jq '.' 2>/dev/null || echo "Health check response received"
fi

echo ""
echo "🎉 Deployment complete!"
echo "=================================================================="
echo "📝 Next steps:"
echo "1. Update your Twilio phone number in src/index.js (line with '+12345678900')"
echo "2. Configure your domain in wrangler.toml if using a custom domain"
echo "3. Test the authentication system:"
echo "   - Visit your Worker URL"
echo "   - Try email verification (development mode logs codes to console)"
echo "   - Try SMS verification with a real phone number"
echo ""
echo "🔧 Development mode features:"
echo "- Auto-fill forms with test data"
echo "- Console logging of verification codes"
echo "- Fallback authentication for offline testing"
echo ""
echo "🔗 Useful commands:"
echo "- View logs: wrangler tail"
echo "- Update secrets: wrangler secret put SECRET_NAME"
echo "- List KV keys: wrangler kv:key list --binding=HEALTH_INSURANCE_DATA"
echo ""
echo "Happy coding! 🚀"
