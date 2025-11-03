"use client"

import React from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon"
import { ModeToggle } from "@/components/shared"
import { NavUser } from "@/components/navigation"
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
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Shield,
  HelpCircle,
  BookOpen,
  MessageCircle,
  LucideIcon,
} from "lucide-react"

type LinkItem = {
  title: string
  href: string
  icon: LucideIcon
  description?: string
}

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
          <Link href="/" className="hover:bg-accent rounded-md p-2">
            <span className="text-lg font-bold">CMS System</span>
          </Link>
          {mounted ? (
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">
                    Tính năng
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-background p-1 pr-1.5">
                    <ul className="bg-popover grid w-lg grid-cols-2 gap-2 rounded-md border p-2 shadow">
                      {featureLinks.map((item, i) => (
                        <li key={i}>
                          <ListItem {...item} />
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">
                    Hỗ trợ
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-background p-1 pr-1.5 pb-1.5">
                    <ul className="bg-popover grid w-lg grid-cols-2 gap-2 rounded-md border p-2 shadow">
                      {supportLinks.map((item, i) => (
                        <li key={i}>
                          <ListItem {...item} />
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" className="bg-transparent" asChild>
                <Link href="/admin/dashboard">Tính năng</Link>
              </Button>
              <Button variant="ghost" className="bg-transparent" asChild>
                <Link href="/admin/support">Hỗ trợ</Link>
              </Button>
            </div>
          )}
        </div>
        {mounted ? (
          <div className="hidden items-center gap-2 md:flex">
            <ModeToggle />
            {isAuthenticated ? (
              <NavUser variant="header" />
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/auth/sign-in">Đăng nhập</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/sign-up">Đăng ký</Link>
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="hidden items-center gap-2 md:flex">
            <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
            <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
          </div>
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
      </nav>
      {mounted && (
        <MobileMenu open={open} className="flex flex-col justify-between gap-2 overflow-y-auto">
          <div className="flex w-full flex-col gap-y-2">
            <span className="text-sm font-medium">Tính năng</span>
            {featureLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="w-full flex flex-row gap-x-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded-sm p-2"
              >
                <div className="bg-background/40 flex aspect-square size-12 items-center justify-center rounded-md border shadow-sm">
                  <link.icon className="text-foreground size-5" />
                </div>
                <div className="flex flex-col items-start justify-center">
                  <span className="font-medium">{link.title}</span>
                  {link.description && (
                    <span className="text-muted-foreground text-xs">{link.description}</span>
                  )}
                </div>
              </Link>
            ))}
            <span className="mt-4 text-sm font-medium">Hỗ trợ</span>
            {supportLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="w-full flex flex-row gap-x-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded-sm p-2"
              >
                <div className="bg-background/40 flex aspect-square size-12 items-center justify-center rounded-md border shadow-sm">
                  <link.icon className="text-foreground size-5" />
                </div>
                <div className="flex flex-col items-start justify-center">
                  <span className="font-medium">{link.title}</span>
                  {link.description && (
                    <span className="text-muted-foreground text-xs">{link.description}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {mounted ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center pb-2">
                <ModeToggle />
              </div>
              {isAuthenticated ? (
                <div className="flex justify-center">
                  <NavUser variant="header" />
                </div>
              ) : (
                <>
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <Link href="/auth/sign-in">Đăng nhập</Link>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href="/auth/sign-up">Đăng ký</Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center pb-2">
                <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
              </div>
              <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
            </div>
          )}
        </MobileMenu>
      )}
    </header>
  )
}

type MobileMenuProps = React.ComponentProps<"div"> & {
  open: boolean
}

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
  if (!open || typeof window === "undefined") return null

  return createPortal(
    <div
      id="mobile-menu"
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg",
        "fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y md:hidden",
      )}
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
            <span className="text-muted-foreground text-xs">{description}</span>
          )}
        </div>
      </Link>
    </NavigationMenuLink>
  )
}

const featureLinks: LinkItem[] = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    description: "Quản lý và theo dõi hệ thống",
    icon: LayoutDashboard,
  },
  {
    title: "Quản lý nội dung",
    href: "#",
    description: "Tạo và quản lý bài viết, trang",
    icon: FileText,
  },
  {
    title: "Quản lý người dùng",
    href: "#",
    description: "Quản lý tài khoản và quyền truy cập",
    icon: Users,
  },
  {
    title: "Cài đặt",
    href: "#",
    description: "Cấu hình hệ thống và tùy chọn",
    icon: Settings,
  },
]

const supportLinks: LinkItem[] = [
  {
    title: "Trung tâm trợ giúp",
    href: "#",
    description: "Hướng dẫn sử dụng và FAQ",
    icon: HelpCircle,
  },
  {
    title: "Tài liệu",
    href: "#",
    description: "Tài liệu và hướng dẫn chi tiết",
    icon: BookOpen,
  },
  {
    title: "Liên hệ",
    href: "#",
    description: "Liên hệ hỗ trợ và phản hồi",
    icon: MessageCircle,
  },
  {
    title: "Chính sách bảo mật",
    href: "#",
    description: "Bảo vệ thông tin người dùng",
    icon: Shield,
  },
]

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

