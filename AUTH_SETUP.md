# WorkOS Authentication Setup Guide with Custom Auth

This guide will help you set up WorkOS authentication for your Praxis AI Platform using a custom JWT session management system with Google OAuth integration.

## Prerequisites

1. A WorkOS account (sign up at [workos.com](https://workos.com))
2. A Google Cloud Console project with OAuth 2.0 credentials
3. Your Next.js project set up with shadcn/ui and enhanced authentication components

## WorkOS Dashboard Configuration

### 1. Create a WorkOS Application

1. Log into your [WorkOS Dashboard](https://dashboard.workos.com)
2. Navigate to "Applications" and create a new application
3. Note down your **Client ID** and **API Secret Key**

### 2. Configure Google OAuth (Required)

**Important**: This application uses Google OAuth through WorkOS, so you must configure Google authentication:

1. In your WorkOS application, go to the "User Management" section
2. Click on "Configuration" → "Authentication Methods"
3. Enable "Google OAuth"
4. You'll need to provide:
   - **Google Client ID**: From your Google Cloud Console project
   - **Google Client Secret**: From your Google Cloud Console project

#### Setting up Google OAuth Credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure the OAuth consent screen
6. Create credentials with:
   - **Application type**: Web application
   - **Authorized redirect URIs**: `https://api.workos.com/sso/oauth/google/callback`
7. Copy the **Client ID** and **Client Secret** to your WorkOS dashboard

### 3. Configure Redirect URIs

1. In your WorkOS application, go to the "Redirects" tab
2. Add the following redirect URIs:
   - **Development**: `http://localhost:3000/api/auth/callback`
   - **Production**: `https://yourdomain.com/api/auth/callback`

### 4. Configure AuthKit

1. In the WorkOS Dashboard, navigate to "User Management"
2. Click "Set up User Management" if you haven't already
3. Configure the authentication methods (Google OAuth must be enabled)
4. Set up your organization settings for multi-tenant support

## Local Environment Setup

### 1. Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your WorkOS credentials in `.env.local`:
   ```env
   # WorkOS Configuration
   WORKOS_CLIENT_ID="client_your_actual_client_id"
   WORKOS_API_KEY="sk_test_your_actual_api_key"
   WORKOS_COOKIE_PASSWORD="your-32-character-secure-password"
   
   # Application URLs
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   NEXT_PUBLIC_WORKOS_REDIRECT_URI="http://localhost:3000/api/auth/callback"
   
   # Optional: Custom branding
   NEXT_PUBLIC_APP_NAME="Praxis AI"
   ```

3. Generate a secure cookie password (minimum 32 characters):
   ```bash
   openssl rand -base64 32
   ```

### 2. Install Dependencies

The required dependencies are already installed:
- `@workos-inc/authkit-nextjs` - WorkOS NextJS integration
- `@workos-inc/node` - WorkOS Node.js SDK
- `jose` - JWT handling for custom session management
- `zod` - Schema validation for forms and API routes
- `react-hook-form` - Form management
- `sonner` - Toast notifications

### 3. Start Development Server

```bash
npm run dev
```

## How It Works

### Enhanced Authentication Flow

1. **Unauthenticated users** visiting protected routes are redirected to `/sign-in`
2. **Sign In/Sign Up pages** use custom forms with Google OAuth through WorkOS
3. **WorkOS AuthKit** handles the OAuth flow with Google
4. **Custom callback route** (`/api/auth/callback`) processes authentication and creates JWT sessions
5. **Personal team auto-creation** for new users without existing organizations
6. **Enhanced session management** with activity tracking and organization switching
7. **Middleware protection** for all routes except auth pages

### Custom Session Management Features

- **JWT-based sessions** with custom encryption using `jose`
- **Organization context** with automatic personal team creation
- **Session persistence** with "Remember Me" functionality (7 days vs 30 days)
- **Activity tracking** with automatic session refresh
- **Organization switching** without re-authentication
- **Enhanced session info** with expiry and activity status

### Key Components

#### Authentication Pages
- **Sign In page** (`/sign-in`): Custom form with Google OAuth integration
- **Sign Up page** (`/sign-up`): Enhanced registration with email verification
- **Verify Code page** (`/verify-code`): Email verification flow
- **Callback route** (`/api/auth/callback`): Custom JWT session creation

#### Session Management
- **Custom session library** (`/src/lib/session.ts`): JWT creation, validation, and management
- **Enhanced middleware** (`/src/middleware.ts`): Route protection with API route separation
- **Organization management** with automatic personal team creation

#### Protected Application
- **Praxis layout** (`/src/app/(praxis)/layout.tsx`): Authenticated layout with sidebar
- **Team management** (`/src/app/(praxis)/admin/teams/`): Complete team administration
- **User profile** (`/src/app/(praxis)/admin/user-profile/`): User management

### API Routes Structure

#### Authentication Routes (Public)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/callback` - OAuth callback handling
- `POST /api/auth/magic-link` - Magic link authentication
- `POST /api/auth/refresh` - Session refresh
- `GET /api/auth/session` - Current session info
- `POST /api/auth/activity` - Activity tracking

#### Team Management Routes (Protected)
- `GET/POST /api/teams` - List/create teams
- `GET/PUT/DELETE /api/teams/[id]` - Team operations
- `GET/POST /api/teams/[id]/members` - Member management
- `GET/POST /api/teams/[id]/domains` - Domain management
- `POST /api/teams/invitations` - Invitation management
- `POST /api/teams/switch` - Organization switching

#### User Management Routes (Protected)
- `GET/PUT /api/user/profile` - User profile management

### Enhanced Error Handling

The authentication system includes comprehensive error handling:

```typescript
interface AuthError {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
  code?: string;
}
```

### Organization Management

- **Automatic personal team creation** for new users
- **Multi-tenant architecture** with organization switching
- **Role-based access control** (admin/member)
- **Team invitation system** with email validation
- **Domain verification** for organization security

## Testing the Integration

1. Start your development server: `npm run dev`
2. Visit `http://localhost:3000`
3. Try to access the main app - you'll be redirected to sign-in
4. Click "Sign up with Google" to create a new account
5. Complete the Google OAuth flow
6. You should be redirected back with:
   - A JWT session cookie
   - Automatically created personal team
   - Access to the main application

## Production Deployment

When deploying to production:

### 1. Update WorkOS Configuration
- Update redirect URIs in WorkOS Dashboard to use your production URL
- Ensure Google OAuth redirect URIs include your production domain
- Use production API keys from WorkOS

### 2. Environment Variables
```env
# Production WorkOS Configuration
WORKOS_CLIENT_ID="client_your_production_client_id"
WORKOS_API_KEY="sk_live_your_production_api_key"
WORKOS_COOKIE_PASSWORD="your-production-32-character-secure-password"

# Production URLs
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_WORKOS_REDIRECT_URI="https://yourdomain.com/api/auth/callback"
```

### 3. Security Considerations
- Use HTTPS in production (required for secure cookies)
- Rotate API keys regularly
- Monitor session activity and implement rate limiting
- Use production-grade cookie encryption

## Customization

### Authentication UI
- Modify components in `/src/components/Auth/`
- Customize styling with Tailwind CSS
- Add your own branding to sign-in/sign-up pages
- Implement custom error handling

### Session Management
- Adjust session duration in `/src/lib/session.ts`
- Customize organization auto-creation logic
- Implement custom activity tracking
- Add session management hooks

### Team Management
- Customize team creation flow in `/src/components/Admin/`
- Implement custom invitation templates
- Add role-based UI restrictions
- Customize domain verification flow

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**: 
   - Ensure your redirect URI in WorkOS Dashboard matches exactly
   - Check that Google OAuth redirect URIs include WorkOS callback

2. **Google OAuth not working**:
   - Verify Google Client ID and Secret are correctly set in WorkOS
   - Check that Google+ API is enabled in Google Cloud Console
   - Ensure OAuth consent screen is properly configured

3. **Cookie encryption errors**: 
   - Make sure `WORKOS_COOKIE_PASSWORD` is at least 32 characters
   - Verify the cookie password is properly encoded

4. **Session not persisting**:
   - Check that cookies are being set with correct domain
   - Verify HTTPS is enabled in production
   - Ensure session middleware is properly configured

5. **Organization/team issues**:
   - Verify WorkOS organization management is enabled
   - Check that personal team creation is working
   - Ensure organization switching API is responding

### Advanced Debugging

1. **Check session status**:
   ```typescript
   const sessionInfo = await getSessionInfo();
   console.log('Session info:', sessionInfo);
   ```

2. **Debug middleware**:
   - Add logging to `/src/middleware.ts`
   - Check which routes are being protected
   - Verify API route separation

3. **Test API routes**:
   - Use tools like Postman to test API endpoints
   - Check authentication headers and responses
   - Verify error handling and validation

### Need Help?

- [WorkOS Documentation](https://workos.com/docs/user-management/nextjs)
- [WorkOS Community](https://workos.com/community)
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## Security Notes

- **Never commit** your `.env.local` file to version control
- **Use strong, unique passwords** for cookie encryption (minimum 32 characters)
- **Regularly rotate** your API keys and OAuth credentials
- **Monitor session activity** and implement logout on suspicious activity
- **Use HTTPS** in production for secure cookie transmission
- **Keep dependencies updated** to avoid security vulnerabilities
- **Implement rate limiting** on authentication endpoints
- **Monitor WorkOS logs** for authentication failures and anomalies

## Advanced Features

### Session Activity Tracking
The system tracks user activity and automatically refreshes sessions:
```typescript
await updateSessionActivity(); // Updates last activity timestamp
const sessionInfo = await getSessionInfo(); // Gets session status
```

### Organization Switching
Users can switch between organizations without re-authentication:
```typescript
await switchOrganization(newOrganizationId);
```

### Enhanced Validation
All forms use Zod schemas for validation:
```typescript
const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  rememberMe: z.boolean().optional(),
});
```

This setup provides a robust, production-ready authentication system with enhanced security, comprehensive session management, and seamless multi-tenant support. 