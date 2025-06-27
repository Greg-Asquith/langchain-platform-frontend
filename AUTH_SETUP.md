# WorkOS Authentication Setup Guide

This guide will help you set up WorkOS authentication for your Next.js application using shadcn/ui components.

## Prerequisites

1. A WorkOS account (sign up at [workos.com](https://workos.com))
2. Your Next.js project set up with shadcn/ui

## WorkOS Dashboard Configuration

### 1. Create a WorkOS Application

1. Log into your [WorkOS Dashboard](https://dashboard.workos.com)
2. Navigate to "Applications" and create a new application
3. Note down your **Client ID** and **API Secret Key**

### 2. Configure Redirect URIs

1. In your WorkOS application, go to the "Redirects" tab
2. Add the following redirect URIs:
   - **Sign-in redirect URI**: `http://localhost:3000/callback`
   - **Sign-out redirect URI**: `http://localhost:3000` (optional)

### 3. Configure AuthKit

1. In the WorkOS Dashboard, navigate to "Overview"
2. Click "Set up User Management" if you haven't already
3. Follow the setup instructions to activate AuthKit

## Local Environment Setup

### 1. Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your WorkOS credentials in `.env.local`:
   ```env
   WORKOS_CLIENT_ID="client_your_actual_client_id"
   WORKOS_API_KEY="sk_test_your_actual_api_key"
   WORKOS_COOKIE_PASSWORD="your-32-character-secure-password"
   NEXT_PUBLIC_WORKOS_REDIRECT_URI="http://localhost:3000/callback"
   ```

3. Generate a secure cookie password (minimum 32 characters):
   ```bash
   openssl rand -base64 32
   ```

### 2. Install Dependencies

The required dependencies are already installed:
- `@workos-inc/authkit-nextjs` - WorkOS NextJS integration
- `shadcn/ui` components (button, card, input, label)

### 3. Start Development Server

```bash
npm run dev
```

## How It Works

### Authentication Flow

1. **Unauthenticated users** visiting `/` see options to sign in or sign up
2. **Sign In/Sign Up pages** (`/sign-in`, `/sign-up`) redirect to WorkOS AuthKit
3. **WorkOS AuthKit** handles the authentication UI and process
4. **Callback route** (`/callback`) processes the authentication response
5. **Authenticated users** are redirected back to the homepage with session data

### Key Components

- **Homepage** (`/`): Shows different content based on authentication status
- **Sign In page** (`/sign-in`): Beautiful shadcn/ui page that redirects to WorkOS
- **Sign Up page** (`/sign-up`): Beautiful shadcn/ui page that redirects to WorkOS
- **Callback route** (`/callback`): Handles WorkOS authentication responses
- **Middleware**: Protects routes and manages sessions

### Styling

The authentication pages use:
- **shadcn/ui components**: Card, Button, Input, Label for consistent styling
- **Tailwind CSS**: For responsive design and theming
- **Dark mode support**: Automatic theme detection

## Testing the Integration

1. Start your development server: `npm run dev`
2. Visit `http://localhost:3000`
3. Click "Sign Up" to create a new account
4. Complete the registration in WorkOS AuthKit
5. You should be redirected back to your app as an authenticated user

## Production Deployment

When deploying to production:

1. Update your redirect URIs in the WorkOS Dashboard to use your production URL
2. Update the `NEXT_PUBLIC_WORKOS_REDIRECT_URI` environment variable
3. Use production API keys from WorkOS
4. Ensure your cookie password is secure and properly set

## Customization

The authentication pages are fully customizable:
- Modify the UI components in `/src/app/sign-in/page.tsx` and `/src/app/sign-up/page.tsx`
- Adjust styling using Tailwind classes
- Add your own branding and messaging
- Customize the post-authentication redirect behavior in `/src/app/callback/route.ts`

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**: Ensure your redirect URI in WorkOS Dashboard matches exactly
2. **Cookie encryption errors**: Make sure `WORKOS_COOKIE_PASSWORD` is at least 32 characters
3. **Environment variables not loading**: Ensure `.env.local` is in the project root and restart your dev server

### Need Help?

- [WorkOS Documentation](https://workos.com/docs/user-management/nextjs)
- [WorkOS Community](https://workos.com/community)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## Security Notes

- Never commit your `.env.local` file to version control
- Use strong, unique passwords for cookie encryption
- Regularly rotate your API keys
- Use HTTPS in production
- Keep your dependencies updated 