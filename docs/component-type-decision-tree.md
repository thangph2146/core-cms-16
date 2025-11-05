# Component Type Decision Tree

Cây quyết định để chọn loại component phù hợp trong Next.js 16.

## 🤔 Cần component gì?

```
                    Component cần gì?
                           |
        ┌──────────────────┼──────────────────┐
        |                  |                  |
    Cần cache?      Cần fetch data?      Cần interactivity?
        |                  |                  |
     YES                  YES                  YES
        |                  |                  |
        |                  |                  └───> Client Component
        |                  |                        ("use client")
        |                  |
        |                  └───> Data thay đổi chậm?
        |                           |
        |                        YES ──> Cache Component
        |                           |    ("use cache")
        |                           |
        |                        NO ──> Server Component
        |                                (no directive)
        |
     NO ──> Cần interactivity?
             |
          YES ──> Client Component
          |
          NO ──> Server Component
```

## 📊 Bảng so sánh nhanh

| Câu hỏi | Cache Component | Server Component | Client Component |
|---------|----------------|------------------|------------------|
| **Cần cache và PPR?** | ✅ | ❌ | ❌ |
| **Cần fetch data từ DB?** | ✅ | ✅ | ⚠️ (không nên) |
| **Cần interactivity?** | ❌ | ❌ | ✅ |
| **Cần hooks?** | ❌ | ❌ | ✅ |
| **Data thay đổi chậm?** | ✅ | ❌ | ❌ |
| **Cần real-time?** | ❌ | ❌ | ✅ |

## 🎯 Ví dụ cụ thể

### Cache Component
- ✅ Dashboard stats (data thay đổi chậm)
- ✅ Analytics reports
- ✅ User list (initial load)
- ✅ Public content pages

### Server Component
- ✅ User detail page
- ✅ Product detail page
- ✅ Blog post page
- ✅ Data tables (initial fetch)

### Client Component
- ✅ Forms (create/edit)
- ✅ Interactive charts
- ✅ Search/filter UI
- ✅ Modals/dialogs
- ✅ Dropdowns/selects
- ✅ Real-time updates

## 📝 Checklist

### Chọn Cache Component nếu:
- [ ] Component có thể được cache
- [ ] Data thay đổi chậm
- [ ] Cần Partial Pre-Rendering
- [ ] Có static shell và dynamic content
- [ ] Không cần real-time updates

### Chọn Server Component nếu:
- [ ] Cần fetch data từ database
- [ ] Không cần interactivity
- [ ] Data cần fresh (không cache được)
- [ ] User-specific sensitive data
- [ ] Không cần hooks hoặc browser APIs

### Chọn Client Component nếu:
- [ ] Cần interactivity (onClick, onChange, etc.)
- [ ] Cần hooks (useState, useEffect, etc.)
- [ ] Cần browser APIs
- [ ] Form submissions
- [ ] Real-time updates
- [ ] Third-party libraries yêu cầu client-side

