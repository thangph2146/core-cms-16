import type { NextApiRequest, NextApiResponse } from "next"
import { Server as IOServer } from "socket.io"
import type { Server as HTTPServer } from "http"

import { logger } from "@/lib/config"
import { setupSocketHandlers } from "@/lib/socket/server"
import { getSocketServer, setSocketServer } from "@/lib/socket/state"

type ServerWithIO = HTTPServer & { io?: IOServer }

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const existingGlobal = getSocketServer()

    // @ts-ignore - Next.js exposes underlying HTTP server
    const server = res.socket?.server as ServerWithIO | undefined

    if (!server) {
      logger.error("Socket server not available for the current request")
      res.status(500).end("Socket server not available")
      return
    }

    if (!server.io) {
      logger.info("Initializing Socket.IO server instance")
      const io = new IOServer(server, {
        path: "/api/socket",
        cors: { origin: true, credentials: true },
      })

      await setupSocketHandlers(io)
      server.io = io
      setSocketServer(io)

      logger.success("Socket.IO server initialized successfully")
    } else {
      if (!existingGlobal) {
        setSocketServer(server.io)
      }
      logger.debug("Reusing existing Socket.IO server instance")
    }

    res.end()
  } catch (error) {
    logger.error("Socket API route error", error instanceof Error ? error : new Error(String(error)))
    res.status(500).end("Internal Server Error")
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}


