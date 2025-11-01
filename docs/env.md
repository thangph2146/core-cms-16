# ============================================================================
# Security
# ============================================================================
# Database Configuration
DATABASE_URL="postgresql://neondb_owner:npg_HeEM5GFu0Ttz@ep-frosty-union-a1a7u47e-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

GOOGLE_CLIENT_ID="855864775191-psghlqqk62ta1n571fimme9i97ecm2v9.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

NEXTAUTH_SECRET="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"

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
