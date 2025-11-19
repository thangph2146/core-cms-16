"use client"

import React from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon"
import { ModeToggle } from "@/components/layouts/shared"
import { NavUser } from "@/components/layouts/navigation"
import { createPortal } from "react-dom"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import {
  HelpCircle,
  LucideIcon,
  LogIn,
  UserPlus,
  LifeBuoy,
  Command,
  Home,
  FileText,
  Info,
  Mail,
} from "lucide-react"
import { Logo } from "../../../../public/svg/Logo"
import { appFeatures } from "@/lib/config/app-features"
import { getResourceMainRoute } from "@/lib/permissions/route-helpers"
import { Separator } from "@/components/ui/separator"

/**
 * Helper functions để lấy routes từ appFeatures
 */
function getRouteFromFeature(key: string): string | null {
  const feature = appFeatures.find((f) => f.key === key)
  if (!feature?.navigation) return null

  const nav = feature.navigation
  if (nav.href) return nav.href

  if (nav.resourceName) {
    const route = getResourceMainRoute(nav.resourceName)
    return route?.path || null
  }

  return null
}

/**
 * Lấy tất cả public features từ appFeatures
 * Sắp xếp theo order
 */
function getPublicFeatures() {
  return appFeatures
    .filter((feature) => feature.navigation?.group === "public")
    .sort((a, b) => (a.navigation?.order || 0) - (b.navigation?.order || 0))
}

/**
 * Convert public features thành LinkItem[]
 */
function getPublicLinks(): LinkItem[] {
  const publicFeatures = getPublicFeatures()
  
  // Map icon names từ app-features.ts
  const iconMap: Record<string, LucideIcon> = {
    Home,
    FileText,
    Info,
    Mail,
    HelpCircle,
  }
  
  return publicFeatures.map((feature) => {
    const nav = feature.navigation!
    const href = nav.href || getRouteFromFeature(feature.key) || "#"
    
    // Extract icon từ React element
    const iconElement = feature.icon
    let IconComponent: LucideIcon = Home // Default icon
    
    // Lấy icon component từ React element
    if (iconElement && typeof iconElement === 'object' && 'type' in iconElement) {
      const iconType = iconElement.type
      // Nếu là function component, lấy tên và map
      if (typeof iconType === 'function' && iconType.name) {
        IconComponent = iconMap[iconType.name] || Home
      } else {
        IconComponent = iconType as LucideIcon
      }
    }

    return {
      title: feature.title,
      href,
      description: feature.description,
      icon: IconComponent,
    }
  })
}

// Public routes constants - Lấy từ appFeatures
const PUBLIC_ROUTES = {
  home: getRouteFromFeature("home") || "/",
  blog: getRouteFromFeature("blog") || "/bai-viet",
  about: getRouteFromFeature("about") || "/about",
  contact: getRouteFromFeature("contact") || "/contact",
  help: getRouteFromFeature("help") || "/help",
  admin: getRouteFromFeature("dashboard") || "/admin/dashboard",
  auth: {
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up",
  },
} as const

type LinkItem = {
  title: string
  href: string
  icon: LucideIcon
  description?: string
}

// Generate public navigation links từ appFeatures
const publicLinks: LinkItem[] = getPublicLinks()

/**
 * Public Header Component
 * Header cho public pages và auth pages
 */
export function PublicHeader() {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const scrolled = useScroll(10)
  const { data: session } = useSession()
  const isAuthenticated = !!session

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <header
      className={cn("sticky top-0 z-50 w-full border-b border-transparent", {
        "bg-background/95 supports-[backdrop-filter]:bg-background/50 border-border backdrop-blur-lg":
          scrolled,
      })}
    >
      <nav className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <Link href={PUBLIC_ROUTES.home} className="dark:bg-foreground rounded-md p-1 flex items-center gap-2">
            <Logo className="h-10 w-10 text-blue-100" />
          </Link>
          <div className="space-y-1">
              <h3 className="text-md text-center font-bold text-foreground">
                Trường Đại học Ngân hàng
              </h3>
              <p className="text-sm font-medium">
                Thành Phố Hồ Chí Minh
              </p>
            </div>
            <Separator orientation="vertical" className="h-4" />
          {mounted ? (
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                {publicLinks.map((link) => {
                  // Hiển thị "Trang chủ" và "Bài viết" trực tiếp
                  if (link.href === PUBLIC_ROUTES.home || link.href === PUBLIC_ROUTES.blog) {
                    return (
                      <NavigationMenuItem key={link.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={link.href}
                            className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                          >
                            {link.href === PUBLIC_ROUTES.home && (
                              <link.icon className="mr-2 h-4 w-4" />
                            )}
                            {link.title}
                          </Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    )
                  }
                  return null
                })}
                {/* Support menu với các links còn lại */}
                {publicLinks.filter(link => 
                  link.href !== PUBLIC_ROUTES.home && link.href !== PUBLIC_ROUTES.blog
                ).length > 0 && (
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent">
                      Hỗ trợ
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="bg-background p-1 pr-1.5 pb-1.5">
                      <ul className="bg-popover grid w-lg grid-cols-2 gap-2">
                        {publicLinks
                          .filter(link => 
                            link.href !== PUBLIC_ROUTES.home && link.href !== PUBLIC_ROUTES.blog
                          )
                          .map((item, i) => (
                            <li key={i}>
                              <ListItem {...item} />
                            </li>
                          ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              {publicLinks.slice(0, 2).map((link) => (
                <Button key={link.href} variant="ghost" className="bg-transparent" asChild>
                  <Link href={link.href}>{link.title}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>
        {mounted ? (
          <div className="flex items-center gap-2">
            <ModeToggle />
            {isAuthenticated ? (
              <div className="hidden md:flex">
                <NavUser />
              </div>
            ) : (
              <>
                <Button variant="outline" asChild className="hidden md:flex">
                  <Link href={PUBLIC_ROUTES.auth.signIn}>Đăng nhập</Link>
                </Button>
                <Button asChild className="hidden md:flex">
                  <Link href={PUBLIC_ROUTES.auth.signUp}>Đăng ký</Link>
                </Button>
              </>
            )}
            <Button
              size="icon"
              variant="outline"
              onClick={() => setOpen(!open)}
              className="md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label="Toggle menu"
            >
              <MenuToggleIcon open={open} className="size-5" duration={300} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
            <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
          </div>
        )}

      </nav>
      {mounted && (
        <MobileMenu open={open} onClose={() => setOpen(false)}>
          <div className="flex flex-col h-full">
            {/* User Section - Top */}
            {isAuthenticated ? (
              <div className="border-b pb-4 mb-4">
                <div className="w-full">
                  <NavUser className="w-full" />
                </div>
              </div>
            ) : (
              <div className="border-b pb-4 mb-4 space-y-2">
                <Button
                  variant="default"
                  className="w-full justify-start gap-3 h-auto py-3"
                  asChild
                  onClick={() => setOpen(false)}
                >
                  <Link href="/auth/sign-in">
                    <div className="bg-primary/10 flex aspect-square size-10 items-center justify-center rounded-md">
                      <LogIn className="text-primary size-5 text-primary-foreground" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Đăng nhập</span>
                      <span className="text-xs text-muted-foreground">Đăng nhập vào tài khoản của bạn</span>
                    </div>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3"
                  asChild
                  onClick={() => setOpen(false)}
                >
                  <Link href="/auth/sign-up">
                    <div className="bg-muted flex aspect-square size-10 items-center justify-center rounded-md">
                      <UserPlus className="text-foreground size-5 text-foreground-primary" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Đăng ký</span>
                      <span className="text-xs text-muted-foreground">Tạo tài khoản mới</span>
                    </div>
                  </Link>
                </Button>
              </div>
            )}

            {/* Navigation Links - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex w-full flex-col gap-y-1">
                {publicLinks.map((link) => {
                  // Hiển thị "Trang chủ" và "Bài viết" trực tiếp
                  if (link.href === PUBLIC_ROUTES.home || link.href === PUBLIC_ROUTES.blog) {
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="w-full flex flex-row gap-x-3 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded-lg p-3 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        <div className="bg-background/40 flex aspect-square size-11 items-center justify-center rounded-lg border shadow-sm shrink-0">
                          <link.icon className="text-foreground size-5" />
                        </div>
                        <div className="flex flex-col items-start justify-center min-w-0 flex-1">
                          <span className="font-medium text-sm">{link.title}</span>
                          {link.description && (
                            <span className="text-xs leading-relaxed">{link.description}</span>
                          )}
                        </div>
                      </Link>
                    )
                  }
                  return null
                })}
                {/* Hiển thị các links còn lại dưới label "Hỗ trợ" */}
                {publicLinks.filter(link => 
                  link.href !== PUBLIC_ROUTES.home && link.href !== PUBLIC_ROUTES.blog
                ).length > 0 && (
                  <>
                    <span className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Hỗ trợ
                    </span>
                    {publicLinks
                      .filter(link => 
                        link.href !== PUBLIC_ROUTES.home && link.href !== PUBLIC_ROUTES.blog
                      )
                      .map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="w-full flex flex-row gap-x-3 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded-lg p-3 transition-colors"
                          onClick={() => setOpen(false)}
                        >
                          <div className="bg-background/40 flex aspect-square size-11 items-center justify-center rounded-lg border shadow-sm shrink-0">
                            <link.icon className="text-foreground size-5" />
                          </div>
                          <div className="flex flex-col items-start justify-center min-w-0 flex-1">
                            <span className="font-medium text-sm">{link.title}</span>
                            {link.description && (
                              <span className="text-xs leading-relaxed">{link.description}</span>
                            )}
                          </div>
                        </Link>
                      ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </MobileMenu>
      )}
    </header>
  )
}

type MobileMenuProps = React.ComponentProps<"div"> & {
  open: boolean
  onClose?: () => void
}

function MobileMenu({ open, children, className, onClose, ...props }: MobileMenuProps) {
  if (!open || typeof window === "undefined") return null

  return createPortal(
    <div
      id="mobile-menu"
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg",
        "fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y md:hidden",
      )}
      onClick={(e) => {
        // Close menu when clicking on backdrop
        if (e.target === e.currentTarget && onClose) {
          onClose()
        }
      }}
    >
      <div
        data-slot={open ? "open" : "closed"}
        className={cn(
          "data-[slot=open]:animate-in data-[slot=open]:zoom-in-97 ease-out",
          "size-full p-4",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

function ListItem({
  title,
  description,
  icon: Icon,
  className,
  href,
  ...props
}: React.ComponentProps<typeof NavigationMenuLink> & LinkItem) {
  return (
    <NavigationMenuLink
      className={cn(
        "w-full flex flex-row gap-x-2 data-[active=true]:focus:bg-accent data-[active=true]:hover:bg-accent data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded-sm p-2",
        className,
      )}
      {...props}
      asChild
    >
      <Link href={href}>
        <div className="bg-background/40 flex aspect-square size-12 items-center justify-center rounded-md border shadow-sm">
          <Icon className="text-foreground size-5" />
        </div>
        <div className="flex flex-col items-start justify-center">
          <span className="font-medium">{title}</span>
          {description && (
            <span className="text-xs">{description}</span>
          )}
        </div>
      </Link>
    </NavigationMenuLink>
  )
}


/**
 * Convert appFeatures thành LinkItem[] cho support section
 * Lấy các features thuộc group "secondary"
 */
function getSupportLinks(): LinkItem[] {
  // Map icon components từ appFeatures
  const iconMap: Record<string, LucideIcon> = {
    support: LifeBuoy,
    feedback: Command,
  }

  const supportFeatures = appFeatures.filter(
    (feature) => feature.navigation?.group === "secondary"
  )

  return supportFeatures.map((feature) => {
    const nav = feature.navigation!
    const href = nav.href || "#"

    // Lấy icon từ map dựa trên feature key
    const icon = iconMap[feature.key] || HelpCircle

    return {
      title: feature.title,
      href,
      description: feature.description,
      icon,
    }
  })
}

// Generate links từ appFeatures
const _supportLinks: LinkItem[] = getSupportLinks()

function useScroll(threshold: number) {
  const [scrolled, setScrolled] = React.useState(false)

  const onScroll = React.useCallback(() => {
    setScrolled(window.scrollY > threshold)
  }, [threshold])

  React.useEffect(() => {
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [onScroll])

  // also check on first load
  React.useEffect(() => {
    onScroll()
  }, [onScroll])

  return scrolled
}

