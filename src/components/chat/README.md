# Chat UI Components

Thư mục này chứa **UI/UX components dùng chung** cho chat feature.

## Nguyên tắc

- ✅ **Pure UI Components**: Chỉ chứa components hiển thị, không có business logic
- ✅ **Reusable**: Có thể sử dụng ở bất kỳ đâu trong ứng dụng
- ✅ **No Dependencies**: Không import từ `features/` hoặc business logic
- ✅ **Props-based**: Nhận data và callbacks qua props

## Cấu trúc

```
components/chat/
├── components/          # UI components
│   ├── attachment-menu.tsx
│   ├── chat-header.tsx
│   ├── chat-input.tsx
│   ├── chat-list-header.tsx
│   ├── chat-window.tsx
│   ├── contact-item.tsx
│   ├── contact-list.tsx
│   ├── empty-state.tsx
│   ├── message-bubble.tsx
│   └── messages-area.tsx
├── types.ts            # Type definitions
├── utils.ts            # Utility functions
├── constants.ts        # Constants
└── index.ts           # Public exports
```

## Sử dụng

```tsx
import { 
  ChatHeader, 
  ChatInput, 
  MessagesArea,
  type Contact,
  type Message 
} from "@/components/chat"
```

## Lưu ý

- ❌ **KHÔNG** import hooks từ `features/admin/chat/hooks`
- ❌ **KHÔNG** import business components từ `features/admin/chat/components`
- ❌ **KHÔNG** gọi API trực tiếp trong components
- ✅ **NÊN** nhận data và callbacks qua props
- ✅ **NÊN** sử dụng dependency injection pattern (như `newConversationDialog` prop)

