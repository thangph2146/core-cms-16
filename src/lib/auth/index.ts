/**
 * Authentication Barrel Export
 * 
 * Export tất cả authentication related utilities từ một nơi
 * 
 * Sử dụng exports này thay vì import trực tiếp từ "next-auth/react"
 * để đảm bảo consistency và dễ dàng thay đổi implementation trong tương lai
 */

// NextAuth configuration (main export)
export { auth, handlers, signIn, signOut } from "./auth"

// Server-side auth utilities
export {
  getSession,
  requireAuth,
  getPermissions,
} from "./auth-server"

// Client-side auth utilities
export {
  authApi,
  useSession,
  signIn as signInClient,
  signOut as signOutClient,
  type SignInRequest,
  type SignUpRequest,
} from "./auth-client"

