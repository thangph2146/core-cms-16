/**
 * Logger utility cho development
 * Hiển thị thời gian, vị trí file, và chi tiết log
 * Hoạt động được cả client-side và server-side
 */

type LogLevel = "info" | "warn" | "error" | "debug" | "success"

// Kiểm tra môi trường (hoạt động cả client và server)
const isServer = typeof window === "undefined"
const isDevelopment = 
  (isServer && process.env.NODE_ENV === "development") ||
  (!isServer && (process.env.NODE_ENV === "development" || window.location.hostname === "localhost"))
const LOG_ENABLED = isDevelopment || 
  (isServer ? process.env.DEBUG === "true" : false) ||
  (!isServer ? (typeof window !== "undefined" && (window as { __DEBUG__?: boolean }).__DEBUG__ === true) : false)
const DEBUG_ENABLED = 
  (isServer ? process.env.DEBUG === "true" || process.env.SOCKET_DEBUG === "true" : false) ||
  (!isServer ? (typeof window !== "undefined" && (window as { __DEBUG__?: boolean }).__DEBUG__ === true) : false)

/**
 * Lấy vị trí file từ stack trace
 */
function getCallerInfo(): string {
  const stack = new Error().stack
  if (!stack) return "unknown"

  const lines = stack.split("\n")
  const projectPath = isServer ? process.cwd() : ""

  // Tìm dòng đầu tiên không phải từ logger.ts hoặc node_modules
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Bỏ qua các dòng từ logger.ts hoặc node_modules
    if (line.includes("logger.ts") || line.includes("node_modules")) {
      continue
    }

    // Extract file path và line number
    // Format: "    at functionName (file://path:line:column)" hoặc "    at path:line:column"
    const match = line.match(/\((.+):(\d+):(\d+)\)|at (.+):(\d+):(\d+)/)
    if (match) {
      const filePath = match[1] || match[4]
      const lineNum = match[2] || match[5]
      if (filePath && lineNum) {
        if (isServer && projectPath && filePath.includes(projectPath)) {
          // Server-side: Lấy đường dẫn tương đối từ project root
          const relativePath = filePath
            .replace(projectPath, "")
            .replace(/^[\\/]/, "")
            .replace(/\\/g, "/")
          return `${relativePath}:${lineNum}`
        } else if (!isServer) {
          // Client-side: Lấy tên file từ URL
          const urlMatch = filePath.match(/\/?([^\/]+\.(ts|tsx|js|jsx)):(\d+)/)
          if (urlMatch) {
            return `${urlMatch[1]}:${lineNum}`
          }
          // Fallback: lấy phần cuối của path
          const parts = filePath.split("/")
          const filename = parts[parts.length - 1] || filePath
          return `${filename}:${lineNum}`
        }
      }
    }
  }

  return "unknown"
}

/**
 * Format timestamp
 */
function formatTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Format log message
 */
function formatLog(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown> | Error | unknown,
): void {
  const timestamp = formatTimestamp()
  const location = getCallerInfo()
  const levelEmoji = {
    info: "🔵",
    success: "🟢",
    warn: "🟡",
    error: "🔴",
    debug: "🔷",
  }[level]

  const prefix = `[${levelEmoji} Socket] ${timestamp}`
  const locationStr = `[${location}]`

  // Format data
  let dataStr = ""
  if (data) {
    if (data instanceof Error) {
      dataStr = `\nError: ${data.message}\nStack: ${data.stack}`
    } else if (typeof data === "object") {
      try {
        dataStr = `\n${JSON.stringify(data, null, 2)}`
      } catch {
        dataStr = `\n${String(data)}`
      }
    } else {
      dataStr = `\n${String(data)}`
    }
  }

  const fullMessage = `${prefix} ${locationStr} ${message}${dataStr}`

  // Log theo level
  switch (level) {
    case "info":
      console.log(fullMessage)
      break
    case "success":
      console.log(fullMessage)
      break
    case "warn":
      console.warn(fullMessage)
      break
    case "error":
      console.error(fullMessage)
      break
    case "debug":
      console.debug(fullMessage)
      break
  }
}

/**
 * Logger instance
 */
export const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    if (LOG_ENABLED) {
      formatLog("info", message, data)
    }
  },

  success: (message: string, data?: Record<string, unknown>) => {
    if (LOG_ENABLED) {
      formatLog("success", message, data)
    }
  },

  warn: (message: string, data?: Record<string, unknown> | Error) => {
    if (LOG_ENABLED) {
      formatLog("warn", message, data)
    }
  },

  error: (message: string, error?: Error | unknown) => {
    if (LOG_ENABLED) {
      formatLog("error", message, error)
    }
  },

  debug: (message: string, data?: Record<string, unknown>) => {
    if (DEBUG_ENABLED) {
      formatLog("debug", message, data)
    }
  },
}

