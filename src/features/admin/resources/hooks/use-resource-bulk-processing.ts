import { useCallback, useRef, useState } from "react"

export interface ResourceBulkProcessingState {
  isProcessing: boolean
  ref: React.MutableRefObject<boolean>
}

interface UseResourceBulkProcessingResult {
  bulkState: ResourceBulkProcessingState
  startBulkProcessing: () => boolean
  stopBulkProcessing: () => void
}

/**
 * Hook chia sẻ để quản lý trạng thái bulk actions giữa các resource hooks
 */
export function useResourceBulkProcessing(): UseResourceBulkProcessingResult {
  const [isProcessing, setIsProcessing] = useState(false)
  const processingRef = useRef(false)

  const startBulkProcessing = useCallback(() => {
    if (processingRef.current) {
      return false
    }
    processingRef.current = true
    setIsProcessing(true)
    return true
  }, [])

  const stopBulkProcessing = useCallback(() => {
    processingRef.current = false
    setIsProcessing(false)
  }, [])

  return {
    bulkState: { isProcessing, ref: processingRef },
    startBulkProcessing,
    stopBulkProcessing,
  }
}

