# Admin Chat Feature

Thư mục này chứa **business logic và hooks** cho chat feature trong admin panel.

## Nguyên tắc

- ✅ **Business Logic**: Chứa hooks, API calls, state management
- ✅ **Feature-specific**: Chỉ dành cho admin chat feature
- ✅ **Uses UI Components**: Import và sử dụng UI components từ `@/components/chat`
- ✅ **Server Integration**: Kết nối với server-side queries, mutations

## Cấu trúc

```
features/admin/chat/
├── hooks/              # Business hooks
│   ├── use-chat.ts                    # Main chat hook
│   ├── use-chat-socket-bridge.ts      # Socket.IO bridge
│   ├── use-chat-helpers.ts            # Helper functions
│   ├── use-chat-api.ts                # API functions
│   └── index.ts
├── components/         # Feature components
│   ├── chat-template.tsx              # Main template (uses hooks)
│   ├── messages-page.tsx              # Server component
│   ├── messages-page-client.tsx       # Client component
│   ├── new-conversation-dialog.tsx    # Business dialog
│   └── index.ts
├── server/            # Server-side logic
│   ├── queries.ts
│   ├── mutations.ts
│   ├── cache.ts
│   └── helpers.ts
└── index.ts          # Public exports
```

## Sử dụng

```tsx
// Import hooks
import { useChat } from "@/features/admin/chat/hooks"

// Import components
import { ChatTemplate } from "@/features/admin/chat/components"

// Import server functions
import { listConversationsCached } from "@/features/admin/chat/server"
```

## Flow

1. **Server Component** (`messages-page.tsx`)
   - Fetch data từ database
   - Pass xuống client component

2. **Client Component** (`messages-page-client.tsx`)
   - Nhận initial data
   - Render `ChatTemplate`

3. **ChatTemplate** (`chat-template.tsx`)
   - Sử dụng `useChat` hook
   - Quản lý state và business logic
   - Render UI components từ `@/components/chat`

4. **UI Components** (`@/components/chat`)
   - Pure presentation components
   - Nhận data và callbacks qua props

