import type { NextApiRequest, NextApiResponse } from "next"
import { Server as IOServer } from "socket.io"
import type { Server as HTTPServer } from "http"

import { logger } from "@/lib/config"
import { setupSocketHandlers } from "@/lib/socket/server"
import {
  getSocketServer,
  setSocketServer,
  getSocketInitPromise,
  setSocketInitPromise,
} from "@/lib/socket/state"

type ServerWithIO = HTTPServer & { io?: IOServer }
const MAX_HTTP_BUFFER_SIZE = 5 * 1024 * 1024

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    // @ts-expect-error - Next.js exposes underlying HTTP server
    const server = res.socket?.server as ServerWithIO | undefined

    if (!server) {
      logger.error("Socket server not available for the current request")
      res.status(500).end("Socket server not available")
      return
    }

    const existingGlobal = getSocketServer()
    if (existingGlobal) {
      if (!server.io) {
        server.io = existingGlobal
      }
      res.end()
      return
    }

    const pendingInit = getSocketInitPromise()
    if (pendingInit) {
      const io = await pendingInit
      if (!server.io) {
        server.io = io
      }
      res.end()
      return
    }

    if (!server.io) {
      logger.info("Initializing Socket.IO server instance")
      const initPromise = (async () => {
        const io = new IOServer(server, {
          path: "/api/socket",
          cors: { origin: true, credentials: true },
          maxHttpBufferSize: MAX_HTTP_BUFFER_SIZE,
        })

        const engineOptions = io.engine.opts as { maxPayload?: number; maxHttpBufferSize: number }
        engineOptions.maxHttpBufferSize = MAX_HTTP_BUFFER_SIZE
        engineOptions.maxPayload = MAX_HTTP_BUFFER_SIZE

        await setupSocketHandlers(io)
        setSocketServer(io)

        logger.success("Socket.IO server initialized successfully")
        return io
      })()

      setSocketInitPromise(initPromise)

      let io: IOServer | undefined
      try {
        io = await initPromise
      } finally {
        setSocketInitPromise(undefined)
      }

      if (!io) {
        throw new Error("Socket.IO server initialization returned undefined instance")
      }

      server.io = io
      res.end()
      return
    }

    const currentSize = server.io.engine.opts.maxHttpBufferSize
    const currentPayload = (server.io.engine.opts as { maxPayload?: number }).maxPayload
    if (currentSize !== MAX_HTTP_BUFFER_SIZE || currentPayload !== MAX_HTTP_BUFFER_SIZE) {
      server.io.engine.opts.maxHttpBufferSize = MAX_HTTP_BUFFER_SIZE
      ;(server.io.engine.opts as { maxPayload?: number }).maxPayload = MAX_HTTP_BUFFER_SIZE
      logger.info("Socket.IO maxHttpBufferSize updated", {
        previousBuffer: currentSize,
        previousPayload: currentPayload ?? null,
        next: MAX_HTTP_BUFFER_SIZE,
      })
    }

    if (!existingGlobal) {
      setSocketServer(server.io)
    }
    logger.debug("Reusing existing Socket.IO server instance")

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
