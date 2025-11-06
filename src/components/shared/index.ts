/**
 * Shared Components Barrel Export
 * 
 * Export các shared/common components từ một nơi
 * 
 * Note: PermissionRouter là Server Component, không export từ đây
 * Import trực tiếp từ "@/components/shared/permission/permission-router"
 */

export { HeroSection } from "./hero-section"
export { ModeToggle } from "./mode-toggle"
export { ForbiddenNotice } from "./forbidden-notice"
export { PermissionGate } from "./permission/gate/permission-gate"

