# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start Next.js development server at http://localhost:3000
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## Architecture Overview

This is a Next.js 15 application for the LangChain Platform Frontend featuring WorkOS authentication with custom JWT session management, multi-tenant team/organization support, and a complete admin interface built with shadcn/ui.

### Key Technology Stack

- **Framework**: Next.js 15 with App Router
- **Auth**: WorkOS AuthKit with custom JWT sessions via `jose`
- **UI**: shadcn/ui components built on Radix UI + Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Multi-tenancy**: WorkOS organizations with automatic personal team creation

### Application Structure

The app uses a dual-layout architecture:

1. **Auth Layout** (`/app/(auth)/`): Unauthenticated pages (sign-in, sign-up, verify-code)
2. **Praxis Layout** (`/app/(praxis)/`): Authenticated app with sidebar navigation

### Authentication Flow

- WorkOS handles OAuth with Google integration
- Custom JWT session management in `src/lib/session.ts`
- Automatic personal team creation for new users
- Organization switching without re-authentication
- Activity tracking with session refresh

### Route Protection

`src/middleware.ts` provides comprehensive protection:
- Public API routes: `/api/auth/*`
- Protected API routes: `/api/teams/*`, `/api/user/*`
- Auto-redirect to `/sign-in` for unauthenticated users
- Session validation for all protected routes

### Key Library Files

- `src/lib/session.ts` - JWT session management, validation, organization context
- `src/lib/workos.ts` - WorkOS SDK initialization and configuration
- `src/lib/teams.ts` - Team/organization management utilities
- `src/lib/error-handler.ts` - Centralized error handling (allows `any` type)
- `src/lib/logger.ts` - Application logging (allows `any` type)

### API Structure

#### Authentication (Public)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/callback` - OAuth callback with JWT creation
- `POST /api/auth/refresh` - Session refresh
- `GET /api/auth/session` - Session info
- `POST /api/auth/activity` - Activity tracking

#### Teams (Protected)
- CRUD operations at `/api/teams/*`
- Member management, invitations, domain verification
- Organization switching via `POST /api/teams/switch`

#### User Management (Protected)
- `GET/PUT /api/user/profile` - User profile operations

### Component Structure

- **Admin Components** (`src/components/Admin/`): Team management, user profiles
- **Auth Components** (`src/components/Auth/`): Sign-in/up forms, verification
- **App Navigation** (`src/components/AppSidebar/`, `src/components/AppHeader/`): Main app navigation
- **UI Components** (`src/components/ui/`): shadcn/ui component library

### Multi-Tenant Features

- Automatic personal team creation for new users
- Organization context in all sessions
- Team switching capabilities
- Role-based access (admin/member)
- Domain verification for organizations

### Configuration Notes

- Security headers configured in `next.config.ts` including CSP, HSTS
- ESLint allows `any` type only in logger and error-handler files
- WorkOS integration requires `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`
- Custom session encryption using minimum 32-character password

### Development Workflow

1. Authentication setup requires WorkOS dashboard configuration (see AUTH_SETUP.md)
2. Environment variables must include WorkOS credentials
3. Google OAuth must be configured through WorkOS for sign-in to work
4. Sessions are JWT-based with activity tracking and organization context
5. All protected routes automatically redirect to sign-in if unauthenticated

### Testing Authentication

Visit http://localhost:3000, get redirected to sign-in, use Google OAuth flow, verify JWT session creation and personal team auto-generation.