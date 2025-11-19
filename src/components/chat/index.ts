/**
 * Chat UI Components
 * 
 * Pure UI/UX components dùng chung cho chat feature.
 * Không chứa business logic, hooks, hoặc API calls.
 * 
 * @see src/features/admin/chat - Business logic và hooks
 */

// Types
export type { Message, Contact, MessageType, ChatTemplateProps, ChatFilterType } from "./types"

// UI Components (pure presentation, no business logic)
export { AttachmentMenu } from "./components/attachment-menu"
export { MessageBubble } from "./components/message-bubble"
export { EmptyState } from "./components/empty-state"
export { ChatHeader } from "./components/chat-header"
export { ContactItem } from "./components/contact-item"
export { ContactList } from "./components/contact-list"
export { MessagesArea } from "./components/messages-area"
export { ChatInput } from "./components/chat-input"
export { ChatWindow, type ChatWindowProps } from "./components/chat-window"

// Utils
export { formatTime, formatMessageTime } from "./utils"
export * from "./utils/message-helpers"
export * from "./utils/contact-helpers"
export * from "./utils/text-helpers"

// Constants
export { TEXTAREA_MIN_HEIGHT, TEXTAREA_MAX_HEIGHT, BASE_OFFSET_REM, REM_TO_PX } from "./constants"

// Hooks
export { useChatElementsHeight, type ChatElementsHeights, type UseChatElementsHeightParams } from "./hooks/use-chat-elements-height"