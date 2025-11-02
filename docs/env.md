# ============================================================================
# Security
# ============================================================================
# Database Configuration
DATABASE_URL="postgresql://neondb_owner:npg_HeEM5GFu0Ttz@ep-frosty-union-a1a7u47e-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# NextAuth / Google OAuth
# 1. Tạo OAuth Client ID (Web application) trong Google Cloud Console.
# 2. Thêm Authorized redirect URI: http://localhost:3000/api/auth/callback/google
# 3. Điền client id/secret vào các biến dưới đây.
# 4. NEXTAUTH_URL phải khớp domain deploy (ví dụ: https://cms.example.com).
# 5. NEXTAUTH_SECRET là chuỗi bí mật random (có thể tạo bằng: openssl rand -base64 32).
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-nextauth-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
# Có thể sử dụng alias AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET nếu thích:
# AUTH_GOOGLE_ID="your-google-client-id"
# AUTH_GOOGLE_SECRET="your-google-client-secret"

# ============================================================================
# Proxy Configuration (Next.js 16)
# ============================================================================
# External API Base URL: URL của backend API để proxy requests
EXTERNAL_API_BASE_URL="http://localhost:8000/api"

# CORS: Danh sách origins được phép (phân cách bởi dấu phẩy)
ALLOWED_ORIGINS="http://localhost:3000,https://yourdomain.com"

# Maintenance Mode: Bật/tắt chế độ bảo trì
# MAINTENANCE_MODE="false"
# MAINTENANCE_BYPASS_KEY="your-secret-key"

# IP Whitelist: Danh sách IP được phép truy cập admin (phân cách bởi dấu phẩy)
# ALLOWED_IPS="127.0.0.1,192.168.1.1"

# ============================================================================
# Logger & Debugging Configuration
# ============================================================================
# Debug Mode: Bật/tắt logging chi tiết cho toàn bộ ứng dụng
# - Trong development mode (NODE_ENV=development), logging tự động bật
# - Đặt DEBUG="true" để bật logging trong production
# - Logger sẽ hiển thị: timestamp, vị trí file, chi tiết log, và stack trace cho errors
# DEBUG="false"

# Socket Debug Mode: Bật/tắt debug logging cho Socket.IO
# - Đặt SOCKET_DEBUG="true" để xem chi tiết các events, connections, và messages
# - Logs sẽ hiển thị: connection/disconnection, room joins/leaves, message sending, notifications
# SOCKET_DEBUG="false"

# ============================================================================
# Environment
# ============================================================================
NODE_ENV="development"