/**
 * Authentication Barrel Export
 * Centralized exports for authentication utilities
 * Use these instead of direct imports from "next-auth/react" for consistency
 */

export { auth, handlers, signIn, signOut } from "./auth"
export { getSession, requireAuth, getPermissions } from "./auth-server"
export {
  authApi,
  useSession,
  signIn as signInClient,
  signOut as signOutClient,
  type SignInRequest,
  type SignUpRequest,
} from "./auth-client"

