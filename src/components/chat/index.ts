/**
 * Chat UI Components
 * 
 * Pure UI/UX components dùng chung cho chat feature.
 * Không chứa business logic, hooks, hoặc API calls.
 * 
 * @see src/features/admin/chat - Business logic và hooks
 */

// Types
export type { Message, Contact, MessageType, ChatTemplateProps } from "./types"

// UI Components (pure presentation, no business logic)
export { AttachmentMenu } from "./components/attachment-menu"
export { MessageBubble } from "./components/message-bubble"
export { EmptyState } from "./components/empty-state"
export { ChatHeader } from "./components/chat-header"
export { ChatListHeader } from "./components/chat-list-header"
export { ContactItem } from "./components/contact-item"
export { ContactList } from "./components/contact-list"
export { MessagesArea } from "./components/messages-area"
export { ChatInput } from "./components/chat-input"
export { ChatWindow } from "./components/chat-window"

// Utils
export { formatTime, formatMessageTime } from "./utils"

// Constants
export { TEXTAREA_MIN_HEIGHT, TEXTAREA_MAX_HEIGHT, BASE_OFFSET_REM, REM_TO_PX } from "./constants"

