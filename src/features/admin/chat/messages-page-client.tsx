"use client"

import { ChatTemplate } from "@/components/chat/chat-template"
import type { Contact, Message, MessageType } from "@/components/chat/chat-template"

/**
 * Helper function để tạo messages với timestamp tự động
 * Dựa trên Prisma Schema Message model
 */
const createMessage = (
  id: string,
  content: string,
  senderId: string | null,
  receiverId: string,
  minutesAgo: number,
  isRead: boolean = true,
  type: MessageType = "PERSONAL",
  subject?: string
): Message => ({
  id,
  content,
  subject,
  senderId,
  receiverId,
  timestamp: new Date(Date.now() - minutesAgo * 60 * 1000),
  isRead,
  type,
  parentId: null,
})

/**
 * Helper để tạo conversation messages (20+ messages cho mỗi contact)
 */
const createConversation = (
  contactId: string,
  currentUserId: string,
  startMinutesAgo: number,
  messageCount: number = 20
): Message[] => {
  const messages: Message[] = []
  let currentMinutes = startMinutesAgo

  for (let i = 0; i < messageCount; i++) {
    const isFromContact = i % 2 === 0
    const senderId = isFromContact ? contactId : currentUserId
    const receiverId = isFromContact ? currentUserId : contactId

    const messageContents = [
      "Hello! How are you doing today?",
      "I'm doing great, thanks for asking!",
      "That's wonderful to hear!",
      "What are you up to?",
      "Just working on some projects. How about you?",
      "Same here, busy day!",
      "I hope everything is going well for you.",
      "Yes, everything is great! Thanks for checking in.",
      "Do you have any plans for the weekend?",
      "Not really, just planning to relax. What about you?",
      "I'm thinking of going hiking. Would you like to join?",
      "That sounds amazing! I'd love to join you.",
      "Perfect! Let's plan the details.",
      "Sure, let me know the time and place.",
      "I'll send you the details later today.",
      "Great! Looking forward to it.",
      "By the way, did you finish that project?",
      "Yes, I just completed it yesterday.",
      "That's excellent! Congratulations!",
      "Thank you! I'm really happy with how it turned out.",
      "You should be proud of your work!",
      "I appreciate your support throughout this.",
      "Anytime! That's what friends are for.",
      "I'm really grateful to have you as a friend.",
      "The feeling is mutual!",
    ]

    const content = messageContents[i % messageContents.length]
    const isRead = !isFromContact || i < messageCount - 3 // Last 3 messages from contact are unread

    messages.push(
      createMessage(
        `m-${contactId}-${i}`,
        content,
        senderId,
        receiverId,
        currentMinutes,
        isRead,
        "PERSONAL"
      )
    )

    // Decrease time for next message (messages get older)
    currentMinutes -= Math.floor(Math.random() * 10) + 5 // 5-15 minutes between messages
  }

  return messages.reverse() // Oldest first
}

/**
 * Mock Data - Contacts và Messages
 * 
 * Dựa trên Prisma Schema:
 * - User model: id, name, email, avatar
 * - Message model: id, senderId, receiverId, content, subject, isRead, type, createdAt
 * 
 * Tổng cộng: 20 contacts, mỗi contact có ít nhất 20 tin nhắn
 */
const currentUserId = "current-user"
const mockContacts: Contact[] = [
  {
    id: "user-1",
    name: "Manoj Rayi",
    email: "manoj.rayi@example.com",
    image: "https://github.com/rayimanoj8.png",
    lastMessage: "I'll send you the details later today.",
    lastMessageTime: new Date(Date.now() - 5 * 60 * 1000),
    unreadCount: 3,
    isOnline: true,
    messages: createConversation("user-1", currentUserId, 120, 22),
  },
  {
    id: "user-2",
    name: "Anjali Kumar",
    email: "anjali.kumar@example.com",
    image: "https://randomuser.me/api/portraits/women/2.jpg",
    lastMessage: "That sounds amazing! I'd love to join you.",
    lastMessageTime: new Date(Date.now() - 15 * 60 * 1000),
    unreadCount: 0,
    isOnline: false,
    messages: createConversation("user-2", currentUserId, 180, 20),
  },
  {
    id: "user-3",
    name: "Ravi Teja",
    email: "ravi.teja@example.com",
    image: "https://randomuser.me/api/portraits/men/3.jpg",
    lastMessage: "Perfect! Let's plan the details.",
    lastMessageTime: new Date(Date.now() - 30 * 60 * 1000),
    unreadCount: 1,
    isOnline: true,
    messages: createConversation("user-3", currentUserId, 240, 21),
  },
  {
    id: "user-4",
    name: "Sneha Reddy",
    email: "sneha.reddy@example.com",
    image: "https://randomuser.me/api/portraits/women/4.jpg",
    lastMessage: "Sure, let me know the time and place.",
    lastMessageTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: true,
    messages: createConversation("user-4", currentUserId, 300, 20),
  },
  {
    id: "user-5",
    name: "Arjun Das",
    email: "arjun.das@example.com",
    image: "https://randomuser.me/api/portraits/men/5.jpg",
    lastMessage: "I'll send you the details later today.",
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: false,
    messages: createConversation("user-5", currentUserId, 360, 23),
  },
  {
    id: "user-6",
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
    lastMessage: "Great! Looking forward to it.",
    lastMessageTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: true,
    messages: createConversation("user-6", currentUserId, 420, 20),
  },
  {
    id: "user-7",
    name: "Vikram Singh",
    email: "vikram.singh@example.com",
    image: "https://randomuser.me/api/portraits/men/7.jpg",
    lastMessage: "By the way, did you finish that project?",
    lastMessageTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
    unreadCount: 2,
    isOnline: true,
    messages: createConversation("user-7", currentUserId, 480, 24),
  },
  {
    id: "user-8",
    name: "Kavya Rao",
    email: "kavya.rao@example.com",
    image: "https://randomuser.me/api/portraits/women/8.jpg",
    lastMessage: "Yes, I just completed it yesterday.",
    lastMessageTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: false,
    messages: createConversation("user-8", currentUserId, 540, 20),
  },
  {
    id: "user-9",
    name: "Rahul Verma",
    email: "rahul.verma@example.com",
    image: "https://randomuser.me/api/portraits/men/9.jpg",
    lastMessage: "That's excellent! Congratulations!",
    lastMessageTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
    unreadCount: 1,
    isOnline: true,
    messages: createConversation("user-9", currentUserId, 600, 22),
  },
  {
    id: "user-10",
    name: "Deepika Nair",
    email: "deepika.nair@example.com",
    image: "https://randomuser.me/api/portraits/women/10.jpg",
    lastMessage: "Thank you! I'm really happy with how it turned out.",
    lastMessageTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: true,
    messages: createConversation("user-10", currentUserId, 720, 20),
  },
  {
    id: "user-11",
    name: "Rohit Malhotra",
    email: "rohit.malhotra@example.com",
    image: "https://randomuser.me/api/portraits/men/11.jpg",
    lastMessage: "You should be proud of your work!",
    lastMessageTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: false,
    messages: createConversation("user-11", currentUserId, 1440, 21),
  },
  {
    id: "user-12",
    name: "Neha Gupta",
    email: "neha.gupta@example.com",
    image: "https://randomuser.me/api/portraits/women/12.jpg",
    lastMessage: "I appreciate your support throughout this.",
    lastMessageTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: true,
    messages: createConversation("user-12", currentUserId, 2880, 20),
  },
  {
    id: "user-13",
    name: "Amit Yadav",
    email: "amit.yadav@example.com",
    image: "https://randomuser.me/api/portraits/men/13.jpg",
    lastMessage: "Anytime! That's what friends are for.",
    lastMessageTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    unreadCount: 2,
    isOnline: true,
    messages: createConversation("user-13", currentUserId, 4320, 23),
  },
  {
    id: "user-14",
    name: "Simran Kaur",
    email: "simran.kaur@example.com",
    image: "https://randomuser.me/api/portraits/women/14.jpg",
    lastMessage: "I'm really grateful to have you as a friend.",
    lastMessageTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: false,
    messages: createConversation("user-14", currentUserId, 5760, 20),
  },
  {
    id: "user-15",
    name: "Varun Chopra",
    email: "varun.chopra@example.com",
    image: "https://randomuser.me/api/portraits/men/15.jpg",
    lastMessage: "The feeling is mutual!",
    lastMessageTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: true,
    messages: createConversation("user-15", currentUserId, 7200, 22),
  },
  {
    id: "user-16",
    name: "Meera Joshi",
    email: "meera.joshi@example.com",
    image: "https://randomuser.me/api/portraits/women/16.jpg",
    lastMessage: "How was your weekend?",
    lastMessageTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    unreadCount: 1,
    isOnline: true,
    messages: createConversation("user-16", currentUserId, 8640, 20),
  },
  {
    id: "user-17",
    name: "Karthik Reddy",
    email: "karthik.reddy@example.com",
    image: "https://randomuser.me/api/portraits/men/17.jpg",
    lastMessage: "It was great! I went hiking. How about yours?",
    lastMessageTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: false,
    messages: createConversation("user-17", currentUserId, 10080, 21),
  },
  {
    id: "user-18",
    name: "Pooja Sharma",
    email: "pooja.sharma@example.com",
    image: "https://randomuser.me/api/portraits/women/18.jpg",
    lastMessage: "That sounds amazing! Mine was relaxing.",
    lastMessageTime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: true,
    messages: createConversation("user-18", currentUserId, 11520, 20),
  },
  {
    id: "user-19",
    name: "Sandeep Kumar",
    email: "sandeep.kumar@example.com",
    image: "https://randomuser.me/api/portraits/men/19.jpg",
    lastMessage: "Nice! Sometimes a relaxing weekend is just what you need.",
    lastMessageTime: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    unreadCount: 0,
    isOnline: true,
    messages: createConversation("user-19", currentUserId, 12960, 22),
  },
  {
    id: "user-20",
    name: "Lavanya Patel",
    email: "lavanya.patel@example.com",
    image: "https://randomuser.me/api/portraits/women/20.jpg",
    lastMessage: "I completely agree! It was much needed.",
    lastMessageTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    unreadCount: 4,
    isOnline: true,
    messages: createConversation("user-20", currentUserId, 14400, 25),
  },
]

/**
 * Messages Page Client Component
 * 
 * Client component wrapper cho ChatTemplate
 * - Tạo và quản lý mock data cho contacts và messages dựa trên Prisma Schema
 * - Trong production, sẽ fetch data từ API
 * - Xử lý client-side logic, loading states, error handling
 */
function MessagesPageClient() {
  return <ChatTemplate contacts={mockContacts} currentUserId={currentUserId} />
}

export { MessagesPageClient }
export type { Contact, Message }
