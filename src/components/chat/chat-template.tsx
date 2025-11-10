"use client"

// ** Imports: React & Hooks **
import React, { useState, useEffect, useRef } from "react"
import { useIsMobile } from "@/hooks/use-mobile"

// ** UI Components **
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CardDescription, CardTitle } from "@/components/ui/card"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

// ** Dropdown Menu Components **
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ** Icons **
import {
  Brush,
  Camera,
  ChartBarIncreasing,
  CircleFadingPlus,
  CircleOff,
  CircleUserRound,
  File,
  Image,
  ListFilter,
  MessageCircle,
  MessageSquareDashed,
  MessageSquareDot,
  Mic,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  SquarePen,
  Star,
  User,
  UserRound,
  Users,
  Video,
} from "lucide-react"

// ** Types - Dựa trên Prisma Schema **
export type MessageType = "NOTIFICATION" | "ANNOUNCEMENT" | "PERSONAL" | "SYSTEM"

export interface Message {
  id: string
  content: string
  subject?: string
  senderId: string | null
  receiverId: string
  timestamp: Date
  isRead: boolean
  type?: MessageType
  parentId?: string | null
}

export interface Contact {
  id: string
  name: string
  email?: string
  image?: string | null
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  isOnline: boolean
  messages: Message[]
}

interface ChatTemplateProps {
  contacts: Contact[]
  currentUserId: string
}

// ** Helper Functions **
const formatTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "Vừa xong"
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  if (days < 7) return `${days} ngày trước`
  return date.toLocaleDateString("vi-VN", { day: "numeric", month: "short" })
}

const formatMessageTime = (date: Date): string => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  }
  return date.toLocaleDateString("vi-VN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

// ** Home Component **
export const ChatTemplate = ({ contacts, currentUserId }: ChatTemplateProps) => {
  const [currentChat, setCurrentChat] = useState<Contact | null>(contacts[0] || null)
  const isMobile = useIsMobile()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const currentMessages = currentChat?.messages || []

  // Auto scroll to bottom when chat or messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current && scrollAreaRef.current) {
        // Find the ScrollArea viewport element
        const viewport = scrollAreaRef.current.closest('[data-slot="scroll-area"]')?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
        if (viewport) {
          // Scroll to bottom of viewport
          setTimeout(() => {
            viewport.scrollTo({
              top: viewport.scrollHeight,
              behavior: "smooth",
            })
          }, 100)
        } else {
          // Fallback: use scrollIntoView
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 100)
        }
      }
    }

    scrollToBottom()
  }, [currentChat?.id, currentMessages.length])

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <ResizablePanelGroup 
        direction="horizontal" 
        className="flex-1 h-full"
      >
        {/* Left Panel - Chat List */}
        <ResizablePanel 
          defaultSize={isMobile ? 100 : 30} 
          minSize={isMobile ? 100 : 25} 
          maxSize={isMobile ? 100 : 50}
          className="flex flex-col min-w-0"
        >
          <div className="flex flex-col h-full border-r bg-background">
            {/* Header */}
            <div className="flex items-center justify-between h-14 px-4 border-b shrink-0">
              <h2 className="text-lg font-semibold">Chats</h2>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <SquarePen className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" /> 
                      New Contact
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Users className="mr-2 h-4 w-4" /> 
                      New Group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ListFilter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Filter Chats By</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <MessageSquareDot className="mr-2 h-4 w-4" /> 
                        Unread
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Star className="mr-2 h-4 w-4" /> 
                        Favorites
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <CircleUserRound className="mr-2 h-4 w-4" /> 
                        Contacts
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <CircleOff className="mr-2 h-4 w-4" /> 
                        Non Contacts
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <Users className="mr-2 h-4 w-4" /> 
                        Groups
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquareDashed className="mr-2 h-4 w-4" /> 
                        Drafts
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative px-4 py-3 border-b shrink-0">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search or start new chat"
                className="pl-9 h-9"
              />
            </div>

            {/* Contact List */}
            <ScrollArea className="max-h-[calc(100dvh-12.5rem)] overflow-y-auto">
              <div className="divide-y">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setCurrentChat(contact)}
                    className={`w-full px-4 py-3 hover:bg-accent/50 transition-colors text-left relative ${
                      currentChat?.id === contact.id ? "bg-accent" : ""
                    }`}
                    aria-label={`Chat with ${contact.name}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={contact.image || undefined} alt={contact.name} />
                          <AvatarFallback className="text-sm">
                            {contact.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        {contact.isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm font-medium truncate">
                            {contact.name}
                          </CardTitle>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatTime(contact.lastMessageTime)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <CardDescription className="text-xs truncate flex-1">
                            {contact.lastMessage}
                          </CardDescription>
                          {contact.unreadCount > 0 && (
                            <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
                              {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        {!isMobile && <ResizableHandle withHandle />}

        {/* Right Panel - Chat Window */}
        {/* Luôn render để tránh lỗi "Previous layout not found" */}
        <ResizablePanel 
          defaultSize={isMobile ? 0 : 70} 
          minSize={isMobile ? 0 : 50}
          className={`flex flex-col min-w-0 ${isMobile ? "hidden" : ""}`}
        >
          {currentChat ? (
            <div className="flex flex-col h-full bg-background">
              {/* Chat Header */}
              <div className="flex items-center gap-3 h-16 px-4 border-b shrink-0">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={currentChat.image || undefined} alt={currentChat.name} />
                  <AvatarFallback className="text-xs">
                    {currentChat.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-semibold truncate">
                    {currentChat.name}
                  </CardTitle>
                  <CardDescription className="text-xs truncate">
                    Contact Info
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Chat Messages Area */}
              <ScrollArea className="max-h-[calc(100dvh-13rem)] overflow-y-auto">
                <div className="flex flex-col p-4 gap-2" ref={scrollAreaRef}>
                  {currentMessages.length > 0 ? (
                    <>
                      {currentMessages.map((message) => {
                        const isOwnMessage = message.senderId === currentUserId
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                isOwnMessage
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm break-words">{message.content}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  isOwnMessage
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {formatMessageTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  ) : (
                    <div className="flex flex-col min-h-full items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Chưa có tin nhắn nào</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="flex items-center gap-1 h-16 px-4 border-t shrink-0">
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                  <Smile className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start">
                    <DropdownMenuItem>
                      <Image className="mr-2 h-4 w-4" /> 
                      Photos & Videos
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Camera className="mr-2 h-4 w-4" /> 
                      Camera
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <File className="mr-2 h-4 w-4" /> 
                      Document
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <UserRound className="mr-2 h-4 w-4" /> 
                      Contact
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ChartBarIncreasing className="mr-2 h-4 w-4" /> 
                      Poll
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Brush className="mr-2 h-4 w-4" /> 
                      Drawing
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input
                  className="flex-1 h-9"
                  placeholder="Type a message"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-background items-center justify-center p-4">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-base font-medium mb-1">Chọn một cuộc trò chuyện</p>
                <p className="text-sm">Bắt đầu trò chuyện từ danh sách bên trái</p>
              </div>
            </div>
          )}
        </ResizablePanel>

        {/* Mobile Chat Window - Full Screen Overlay */}
        {isMobile && currentChat && (
          <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
            {/* Chat Header */}
            <div className="flex items-center gap-3 h-16 px-4 border-b shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentChat(null)}
              >
                <Phone className="h-4 w-4 rotate-90" />
              </Button>
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={currentChat.image || undefined} alt={currentChat.name} />
                <AvatarFallback className="text-xs">
                  {currentChat.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold truncate">
                  {currentChat.name}
                </CardTitle>
                <CardDescription className="text-xs truncate">
                  Contact Info
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat Messages Area */}
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="flex flex-col p-4 gap-2">
                {currentMessages.length > 0 ? (
                  <>
                    {currentMessages.map((message) => {
                      const isOwnMessage = message.senderId === currentUserId
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm break-words">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwnMessage
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatMessageTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div className="flex flex-col min-h-full items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Chưa có tin nhắn nào</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="flex items-center gap-1 h-16 px-4 border-t shrink-0">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <Smile className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start">
                  <DropdownMenuItem>
                    <Image className="mr-2 h-4 w-4" /> 
                    Photos & Videos
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Camera className="mr-2 h-4 w-4" /> 
                    Camera
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <File className="mr-2 h-4 w-4" /> 
                    Document
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <UserRound className="mr-2 h-4 w-4" /> 
                    Contact
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ChartBarIncreasing className="mr-2 h-4 w-4" /> 
                    Poll
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Brush className="mr-2 h-4 w-4" /> 
                    Drawing
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Input
                className="flex-1 h-9"
                placeholder="Type a message"
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </ResizablePanelGroup>
    </div>
  )
}
