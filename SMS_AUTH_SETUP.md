# SMS Authentication Setup Guide

This guide will help you set up phone authentication for your Class Check-In app.

## Overview

Phone authentication has been added to both the **Login** and **Register** pages. Users can:
1. Enter their phone number (with country code)
2. Receive a 6-digit verification code via SMS
3. Enter the code to complete authentication

## Prerequisites

To use phone authentication, you need to:
1. Enable phone auth in Supabase
2. Configure an SMS provider
3. Add the provider credentials to Supabase

## SMS Provider Options

### Free/Trial Options

#### 1. **Twilio (Recommended for Testing)**
- **Free Trial**: $15 credit (~200-300 SMS messages)
- **Limitation**: Can only send to verified phone numbers during trial
- **Upgrade Required**: After trial ends or credit runs out
- **Pricing**: $0.0079/SMS for US, varies by country

**Best for**: Development and testing with a limited number of test phone numbers

#### 2. **AWS SNS Free Tier**
- **Free Tier**: 100 SMS/month (permanently free)
- **Limitation**: May be restricted to certain regions
- **Requirements**: AWS account (requires credit card)
- **Pricing**: After free tier: ~$0.00645/SMS for US

**Best for**: Small production apps with <100 SMS/month

#### 3. **MessageBird**
- **Free Trial**: €10 credit (~140 SMS messages)
- **Limitation**: Trial credits expire after 1 month
- **Upgrade Required**: After trial
- **Pricing**: Varies by country

**Best for**: Testing in European markets

### Production Options

For production use, you'll need a paid SMS provider. Popular choices:
- **Twilio**: Most popular, best documentation
- **Vonage (Nexmo)**: Competitive pricing
- **AWS SNS**: Best if already using AWS
- **MessageBird**: Good for international coverage

## Setup Instructions

### Option 1: Twilio (Recommended)

#### Step 1: Create a Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free account
3. Verify your email and phone number
4. Complete the onboarding steps

#### Step 2: Get Your Credentials

1. Go to your **Twilio Console Dashboard**
2. Find your **Account SID** and **Auth Token**
3. Get a phone number:
   - Click **Phone Numbers** → **Manage** → **Buy a number**
   - Select a number with SMS capabilities
   - During trial, this is free

#### Step 3: Verify Test Phone Numbers (Trial Only)

During trial, you can only send SMS to verified numbers:
1. Go to **Phone Numbers** → **Verified Caller IDs**
2. Click **Add a new number**
3. Enter the phone number you want to test with
4. Complete the verification process

#### Step 4: Configure Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Phone** provider
4. Select **Twilio** as the SMS provider
5. Enter your credentials:
   - **Twilio Account SID**: Your Account SID from Step 2
   - **Twilio Auth Token**: Your Auth Token from Step 2
   - **Twilio Phone Number**: Your Twilio phone number (e.g., +1234567890)
6. Click **Save**

#### Step 5: Test the Integration

1. Run your app: `bun run dev`
2. Go to the Login page
3. Click "Or sign in with phone"
4. Enter a verified phone number (with country code, e.g., +1234567890)
5. Click "Send Verification Code"
6. Check your phone for the SMS
7. Enter the 6-digit code
8. Click "Verify"

### Option 2: AWS SNS

#### Step 1: Create AWS Account

1. Go to https://aws.amazon.com
2. Create a new AWS account (requires credit card)
3. Sign in to AWS Console

#### Step 2: Configure SNS

1. Go to **SNS (Simple Notification Service)**
2. Click **Text messaging (SMS)**
3. Configure SMS settings:
   - Set spending limit
   - Choose default message type (Promotional or Transactional)
4. Note your AWS Region (e.g., us-east-1)

#### Step 3: Create IAM Credentials

1. Go to **IAM** → **Users**
2. Click **Create user**
3. Add permissions: **AmazonSNSFullAccess**
4. Create access keys (Access Key ID and Secret Access Key)
5. Save these credentials securely

#### Step 4: Configure Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Phone** provider
4. Select **AWS SNS** as the SMS provider
5. Enter your credentials:
   - **AWS Access Key ID**: From Step 3
   - **AWS Secret Access Key**: From Step 3
   - **AWS Region**: From Step 2 (e.g., us-east-1)
6. Click **Save**

## Phone Number Format

Users must enter phone numbers in **E.164 format**:
- Include country code with `+` prefix
- No spaces, dashes, or parentheses
- Examples:
  - US: `+12025551234`
  - Mexico: `+525512345678`
  - UK: `+447911123456`

The UI shows this format hint to users.

## Testing Without SMS (Development Only)

For development without a real SMS provider:

1. Use Supabase's test mode (no actual SMS sent)
2. Check Supabase logs for OTP codes
3. Use those codes to verify

**Note**: This only works in development. Production requires a real SMS provider.

## Cost Estimates

### Twilio
- **Trial**: Free $15 credit
- **Production**: ~$0.0079/SMS (US)
- **Monthly cost for 1000 SMS**: ~$7.90

### AWS SNS
- **Free Tier**: First 100 SMS/month free forever
- **Production**: ~$0.00645/SMS (US)
- **Monthly cost for 1000 SMS**: ~$6.45

### MessageBird
- **Trial**: Free €10 credit
- **Production**: Varies by country
- **Monthly cost for 1000 SMS**: ~$8-12

## Best Practices

1. **Use transactional SMS type** for OTP codes (better delivery)
2. **Set rate limits** to prevent abuse
3. **Monitor SMS usage** to avoid unexpected costs
4. **Use Twilio trial** for development, upgrade for production
5. **Consider AWS SNS** if you need <100 SMS/month permanently free
6. **Store credentials securely** in environment variables (never commit them)

## Troubleshooting

### SMS Not Sending

1. **Check Supabase logs**: Authentication → Logs
2. **Verify credentials**: Make sure Account SID, Auth Token, and phone number are correct
3. **Check phone number format**: Must be E.164 format (+1234567890)
4. **Twilio trial**: Make sure the recipient number is verified in Twilio console

### Invalid OTP Error

1. **Code expired**: OTP codes expire after 60 seconds (default)
2. **Wrong code**: Make sure you're entering the correct 6-digit code
3. **Code already used**: Each code can only be used once

### Permission Errors (AWS SNS)

1. **IAM permissions**: Make sure the IAM user has `AmazonSNSFullAccess`
2. **Region mismatch**: Make sure the region in Supabase matches your AWS region
3. **Credentials**: Double-check Access Key ID and Secret Access Key

## Recommendation

**For your use case**, I recommend:

1. **Start with Twilio Trial** ($15 free credit)
   - Easy to set up
   - Works well for testing
   - Can verify a few test phone numbers
   - Upgrade to paid when you're ready to launch

2. **Migrate to AWS SNS** if you need <100 SMS/month
   - Permanently free tier
   - Good for small production apps

3. **Stick with Twilio** for larger scale
   - Best documentation
   - Most reliable
   - Good international coverage

## Next Steps

1. Choose an SMS provider (Twilio recommended)
2. Follow the setup instructions above
3. Test phone auth with verified numbers
4. Monitor usage and costs
5. Upgrade to paid plan when ready for production
