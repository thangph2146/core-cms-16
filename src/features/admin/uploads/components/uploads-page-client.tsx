"use client"

/**
 * Uploads Page Client Component
 * Component client để xử lý upload và hiển thị danh sách hình ảnh đã upload
 */

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { MultipleImageUpload } from "@/components/forms"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ImageIcon, Upload, Loader2, Trash2 } from "lucide-react"
import { logger } from "@/lib/config"
import { SelectionActionsWrapper } from "@/features/admin/resources/components"
import type { UploadResponse } from "@/features/admin/uploads/types"
import { useUploadsStore } from "../store/uploads-store"
import {
  useImagesList,
  useFoldersList,
  useDeleteFolder,
  useDeleteImage,
  useBulkDeleteImages,
} from "../hooks/use-uploads-queries"
import { queryKeys } from "../config/query-keys"
import { useDialogs } from "../hooks/use-dialogs"
import { useFolderTreeInitialization } from "../hooks/use-folder-tree-initialization"
import { CreateFolderForm } from "./create-folder-form"
import { FolderSelector } from "./folder-selector"
import { FolderTreeNode } from "./folder-tree-node"
import { ImageGrid } from "./image-grid"
import { Pagination } from "./pagination"
import { ViewModeToggle } from "./view-mode-toggle"
import { DeleteDialogs } from "./delete-dialogs"

export function UploadsPageClient() {
  const queryClient = useQueryClient()

  // Zustand Store - UI State
  const {
    viewMode,
    currentPage,
    selectedImages,
    selectedFolder,
    openFolders,
    setViewMode,
    setCurrentPage,
    toggleImageSelection,
    selectAllImages,
    clearSelection,
    setOpenFolders,
  } = useUploadsStore()

  // TanStack Query - Server State
  const { data: imagesData, isLoading } = useImagesList(currentPage, 50)
  const { data: availableFolders = [], isLoading: isLoadingFolders } = useFoldersList()

  // Mutations
  const deleteFolderMutation = useDeleteFolder()
  const deleteImageMutation = useDeleteImage()
  const bulkDeleteImagesMutation = useBulkDeleteImages()

  // Dialogs state management
  const {
    bulkDeleteConfirm,
    singleDeleteConfirm,
    folderDeleteConfirm,
    openBulkDelete,
    closeBulkDelete,
    openSingleDelete,
    closeSingleDelete,
    openFolderDelete,
    closeFolderDelete,
  } = useDialogs()

  // Local UI state for tracking deletions
  const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set())

  // Derived data
  const allImages = React.useMemo(() => imagesData?.data || [], [imagesData?.data])
  const folderTree = imagesData?.folderTree || null
  const pagination = imagesData?.pagination || null

  // Preserve selected folder when folders list changes
  React.useEffect(() => {
    if (selectedFolder && availableFolders.length > 0) {
      const stillExists = availableFolders.some((f) => f.path === selectedFolder)
      if (!stillExists) {
        useUploadsStore.getState().setSelectedFolder(null)
      }
    }
  }, [availableFolders, selectedFolder])

  // Initialize folder tree open state
  useFolderTreeInitialization({
    folderTree,
    openFolders,
    setOpenFolders,
    maxLevel: 2,
  })

  // Get folder path based on selected folder
  const getFolderPath = React.useCallback((): { path: string | null; isExistingFolder: boolean } => {
    if (selectedFolder) {
      return { path: selectedFolder, isExistingFolder: true }
    }
    return { path: null, isExistingFolder: false }
  }, [selectedFolder])

  // Handle upload success
  const handleUploadSuccess = React.useCallback((data: UploadResponse["data"]) => {
    logger.success("Image uploaded successfully in client", {
      fileName: data.fileName,
      originalName: data.originalName,
      url: data.url,
      size: data.size,
    })

    // Invalidate queries để refresh danh sách hình ảnh và folders
    queryClient.invalidateQueries({
      queryKey: queryKeys.uploads.images.all(),
    })
    queryClient.invalidateQueries({
      queryKey: queryKeys.uploads.folders.list(),
    })
  }, [queryClient])

  // Handle delete image
  const handleDeleteImageConfirm = React.useCallback(() => {
    if (!singleDeleteConfirm?.image) return

    const image = singleDeleteConfirm.image
    const deleteId = image.fileName
    setDeletingIds((prev) => new Set(prev).add(deleteId))

    deleteImageMutation.mutate(image.relativePath, {
      onSettled: () => {
        setDeletingIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(deleteId)
          return newSet
        })
        closeSingleDelete()
      },
    })
  }, [singleDeleteConfirm, deleteImageMutation, closeSingleDelete])

  // Handle bulk delete
  const handleBulkDeleteConfirm = React.useCallback(() => {
    if (selectedImages.size === 0 || !bulkDeleteConfirm) return

    const selectedImagesList = allImages.filter((img) => selectedImages.has(img.fileName))
    const relativePaths = selectedImagesList.map((img) => img.relativePath)

    bulkDeleteImagesMutation.mutate(relativePaths, {
      onSettled: () => {
        closeBulkDelete()
      },
    })
  }, [selectedImages, bulkDeleteConfirm, allImages, bulkDeleteImagesMutation, closeBulkDelete])

  // Handle delete folder
  const handleDeleteFolderConfirm = React.useCallback(() => {
    if (!folderDeleteConfirm) return

    const { folderPath } = folderDeleteConfirm
    deleteFolderMutation.mutate(folderPath, {
      onSettled: () => {
        closeFolderDelete()
      },
    })
  }, [folderDeleteConfirm, deleteFolderMutation, closeFolderDelete])

  // Derived selection state
  const isAllSelected = allImages.length > 0 && selectedImages.size === allImages.length
  const isIndeterminate = selectedImages.size > 0 && selectedImages.size < allImages.length

  // Handle select all
  const handleSelectAll = React.useCallback(
    (checked: boolean | "indeterminate") => {
      if (checked === true || checked === "indeterminate") {
        selectAllImages(allImages)
      } else {
        clearSelection()
      }
    },
    [allImages, selectAllImages, clearSelection]
  )

  // Keyboard shortcut: Ctrl+A / Cmd+A to select all
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault()
        if (allImages.length > 0) {
          if (isAllSelected) {
            clearSelection()
          } else {
            selectAllImages(allImages)
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [allImages, isAllSelected, selectAllImages, clearSelection])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 shrink-0" />
            <span>Upload hình ảnh mới</span>
          </CardTitle>
          <CardDescription>
            Kéo thả hoặc chọn nhiều file hình ảnh để upload. Tự động resize và compress nếu cần.
            Hỗ trợ JPG, PNG, GIF, WEBP, SVG (tối đa 5MB mỗi file)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreateFolderForm
            availableFolders={availableFolders}
            isLoadingFolders={isLoadingFolders}
          />

          <FolderSelector
            availableFolders={availableFolders}
            isLoadingFolders={isLoadingFolders}
            onDeleteFolder={openFolderDelete}
          />

          <MultipleImageUpload
            onUploadSuccess={handleUploadSuccess}
            onUploadError={(error: string) => {
              logger.error("Upload error from component", {
                error: new Error(error),
              })
            }}
            label=""
            maxSizeMB={5}
            maxDimension={500}
            folderPath={getFolderPath().path}
            isExistingFolder={getFolderPath().isExistingFolder}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 shrink-0" />
                <span className="truncate">Tất cả hình ảnh</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {pagination
                  ? `Tổng cộng ${pagination.total} hình ảnh${viewMode === "tree" && folderTree ? " (theo thư mục)" : ""}`
                  : "Danh sách tất cả hình ảnh đã upload"}
              </CardDescription>
            </div>
            {!isLoading && allImages.length > 0 && (
              <div className="flex items-center justify-between gap-2 sm:gap-4 shrink-0">
                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 group cursor-pointer">
                      <Checkbox
                        checked={isIndeterminate ? "indeterminate" : isAllSelected}
                        onCheckedChange={handleSelectAll}
                        className="w-5 h-5 transition-all duration-200 group-hover:scale-110"
                        aria-label={
                          isAllSelected
                            ? "Bỏ chọn tất cả hình ảnh"
                            : isIndeterminate
                              ? `Đã chọn ${selectedImages.size}/${allImages.length} hình ảnh. Click để chọn tất cả`
                              : "Chọn tất cả hình ảnh"
                        }
                      />
                      <label
                        htmlFor="select-all-checkbox"
                        className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer select-none transition-colors hover:text-foreground"
                        onClick={(e) => {
                          e.preventDefault()
                          handleSelectAll(isAllSelected ? false : true)
                        }}
                      >
                        {isIndeterminate ? (
                          <span className="font-medium text-foreground">
                            Đã chọn {selectedImages.size}/{allImages.length}
                          </span>
                        ) : (
                          "Chọn tất cả"
                        )}
                      </label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <div className="flex flex-col gap-1">
                      <span>
                        {isAllSelected
                          ? "Bỏ chọn tất cả hình ảnh"
                          : isIndeterminate
                            ? `Chọn tất cả ${allImages.length} hình ảnh`
                            : `Chọn tất cả ${allImages.length} hình ảnh`}
                      </span>
                      <span className="">
                        Nhấn <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded border">Ctrl+A</kbd> để chọn/bỏ chọn
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : allImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có hình ảnh nào được upload</p>
            </div>
          ) : (
            <>
              {selectedImages.size > 0 && (
                <div className="mb-4">
                  <SelectionActionsWrapper
                    label={`Đã chọn ${selectedImages.size} hình ảnh`}
                    actions={
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={bulkDeleteImagesMutation.isPending || selectedImages.size === 0}
                          onClick={() => openBulkDelete(selectedImages.size)}
                          className="whitespace-nowrap"
                        >
                          {bulkDeleteImagesMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">
                            Xóa {selectedImages.size} hình đã chọn
                          </span>
                          <span className="sm:hidden">Xóa</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => clearSelection()}
                          className="whitespace-nowrap"
                        >
                          Bỏ chọn
                        </Button>
                      </>
                    }
                  />
                </div>
              )}
              {viewMode === "tree" && folderTree ? (
                <div className="space-y-2">
                  {folderTree.subfolders.map((subfolder) => (
                    <FolderTreeNode
                      key={subfolder.path}
                      folder={subfolder}
                      level={0}
                      openFolders={openFolders}
                      setOpenFolders={setOpenFolders}
                      selectedImages={selectedImages}
                      deletingIds={deletingIds}
                      onToggleSelect={toggleImageSelection}
                      onDelete={openSingleDelete}
                    />
                  ))}
                  {folderTree.images.length > 0 && (
                    <ImageGrid
                      images={folderTree.images}
                      selectedImages={selectedImages}
                      deletingIds={deletingIds}
                      onToggleSelect={toggleImageSelection}
                      onDelete={openSingleDelete}
                    />
                  )}
                </div>
              ) : (
                <ImageGrid
                  images={allImages}
                  selectedImages={selectedImages}
                  deletingIds={deletingIds}
                  onToggleSelect={toggleImageSelection}
                  onDelete={openSingleDelete}
                />
              )}
              {pagination && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <DeleteDialogs
        bulkDeleteConfirm={bulkDeleteConfirm}
        singleDeleteConfirm={singleDeleteConfirm}
        folderDeleteConfirm={folderDeleteConfirm}
        isBulkDeleting={bulkDeleteImagesMutation.isPending}
        isSingleDeleting={(fileName) => deletingIds.has(fileName)}
        isFolderDeleting={(folderPath) =>
          deleteFolderMutation.isPending && deleteFolderMutation.variables === folderPath
        }
        onBulkDeleteConfirm={handleBulkDeleteConfirm}
        onSingleDeleteConfirm={handleDeleteImageConfirm}
        onFolderDeleteConfirm={handleDeleteFolderConfirm}
        onCloseBulkDelete={closeBulkDelete}
        onCloseSingleDelete={closeSingleDelete}
        onCloseFolderDelete={closeFolderDelete}
      />
    </>
  )
}
