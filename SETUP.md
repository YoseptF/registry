# Class Check-In System - Setup Guide

## Prerequisites

- Node.js (v18 or later) or Bun
- A Supabase account
- Google OAuth credentials (optional, for Google login)
- Apple OAuth credentials (optional, for Apple login)

## 1. Supabase Setup

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be set up

### Run the Database Schema

1. Open the SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql` from the root of this project
3. Paste and run the SQL to create all tables, policies, and functions

### Get Your Supabase Credentials

1. Go to Project Settings > API
2. Copy your Project URL and anon/public key

## 2. Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## 3. OAuth Setup (Optional)

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
6. Copy the Client ID and Client Secret
7. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Google
   - Paste your Client ID and Client Secret

### Apple OAuth

1. Go to [Apple Developer](https://developer.apple.com)
2. Create a Service ID
3. Configure Sign in with Apple
4. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Apple
   - Follow Supabase's Apple OAuth guide

## 4. Install Dependencies

```bash
bun install
```

## 5. Run Development Server

```bash
bun dev
```

The app should now be running at `http://localhost:5173`

## 6. Create Your First Admin User

Since the first user will be created as a regular user, you need to manually promote them to admin:

1. Register a user through the app
2. Go to Supabase Dashboard > Table Editor > profiles
3. Find your user and change the `role` field from `user` to `admin`
4. Log out and log back in to see admin features

## App Structure

### Pages

- **Landing** (`/`) - Welcome page with links to login/register
- **Login** (`/login`) - Login with email/password, Google, or Apple
- **Register** (`/register`) - Self-registration form
- **User Dashboard** (`/user`) - User profile and QR code
- **Admin Dashboard** (`/admin`) - Admin panel (requires admin role)
- **Check-in** (`/checkin/:classId`) - QR scanner for class check-in

### Key Features

#### For Users
- View personal profile
- Display QR code for check-in
- See enrolled classes
- View check-in history

#### For Admins
- Create and manage classes
- View all users
- Real-time check-in monitoring
- Assign users to classes (via database)
- View attendance reports

## Database Schema

### Tables

- `profiles` - User information (extends auth.users)
- `classes` - Class definitions
- `class_memberships` - User enrollment in classes
- `check_ins` - Attendance records
- `temporary_users` - Guest/walk-in users

### Row Level Security

All tables have RLS enabled with policies that:
- Allow users to view their own data
- Allow admins to view and modify all data
- Allow check-in creation by anyone (for the scanner)

## Adding Users to Classes

Currently, adding users to classes must be done via the Supabase dashboard:

1. Go to Table Editor > class_memberships
2. Insert a new row:
   - `class_id`: Select from classes table
   - `user_id`: Select from profiles table

Future enhancement: Build UI for admins to manage class memberships.

## Customization

### QR Code Logo

To add your logo to QR codes:

1. Add your logo file to `public/logo.svg`
2. The QR code in UserDashboard.tsx will automatically include it

### Colors

The app uses a pink/purple gradient theme. To customize:

1. Edit `src/index.css`
2. Modify the color variables in the `@theme` block

## Troubleshooting

### Can't scan QR codes

- Make sure you're using HTTPS or localhost (cameras require secure context)
- Check browser permissions for camera access
- Test with different browsers (Chrome/Safari recommended)

### OAuth not working

- Check redirect URLs match exactly in provider settings
- Ensure environment variables are correct
- Check Supabase provider configuration

### RLS policy errors

- Make sure you ran the complete SQL schema
- Check if the user is properly authenticated
- Verify the user's role in the profiles table

## Production Deployment

1. Build the app:
   ```bash
   bun run build
   ```

2. Deploy to your hosting platform (Vercel, Netlify, etc.)

3. Set environment variables in your hosting platform

4. Update OAuth redirect URLs to production domain

5. Enable email confirmations in Supabase (optional)

## License

MIT
