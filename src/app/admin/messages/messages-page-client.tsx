"use client"

import { Bot } from "lucide-react"
import { ChatPlugin, type ChatMessage } from "@/components/chat/chat-plugin"

export function MessagesPageClient() {
  // Initial messages
  const initialMessages: ChatMessage[] = [
    {
      id: 1,
      content: "Xin chào! Tôi có thể giúp gì cho bạn hôm nay?",
      sender: "ai",
      timestamp: new Date(),
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop",
      avatarFallback: "AI",
    },
    {
      id: 2,
      content: "Tôi có một câu hỏi về hệ thống quản trị.",
      sender: "user",
      timestamp: new Date(),
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop",
      avatarFallback: "US",
    },
    {
      id: 3,
      content: "Chắc chắn rồi! Tôi rất vui được giúp đỡ. Bạn muốn biết điều gì?",
      sender: "ai",
      timestamp: new Date(),
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop",
      avatarFallback: "AI",
    },
  ]

  // Simulate AI response
  const handleSendMessage = async (_message: string): Promise<string> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000))
    
    // Return AI response
    return "Đây là phản hồi từ AI cho tin nhắn của bạn."
  }

  return (
    <ChatPlugin
      size="lg"
      position="bottom-right"
      icon={<Bot className="h-6 w-6" />}
      renderPage={true}
      className="h-full min-h-[calc(100vh-160px)]"
      title="Chat với AI"
      description="Hỏi tôi bất cứ điều gì về hệ thống"
      placeholder="Nhập tin nhắn của bạn... (Enter để gửi, Shift+Enter để xuống dòng)"
      emptyStateTitle="Chưa có tin nhắn"
      emptyStateDescription="Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn đầu tiên của bạn"
      initialMessages={initialMessages}
      onSendMessage={handleSendMessage}
      showAttachButton={true}
      showMicrophoneButton={true}
      showTimestamp={true}
      maxInputRows={5}
      minInputRows={1}
    />
  )
}
