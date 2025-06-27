import { handleAuth } from '@workos-inc/authkit-nextjs';

// This route handles the callback from WorkOS after authentication
export const GET = handleAuth({
  returnPathname: '/', // Redirect to home page after successful authentication
}); 