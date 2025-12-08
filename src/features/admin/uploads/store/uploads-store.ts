/**
 * Uploads Store (Zustand)
 * Manages UI state for uploads feature
 * Follows Zustand best practices with devtools and persist support
 */

import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

interface ImageItem {
  fileName: string
  originalName: string
  size: number
  mimeType: string
  url: string
  relativePath: string
  createdAt: number
}

interface UploadsUIState {
  // View state
  viewMode: "flat" | "tree"
  currentPage: number
  
  // Selection state
  selectedImages: Set<string>
  selectedFolder: string | null
  
  // Folder tree UI state
  openFolders: Set<string>
  openFolderPaths: Set<string>
  openFolderPathsUpload: Set<string>
  openFolderPathsString: Set<string>
  
  // Popover states
  folderTreeSelectOpen: boolean
  folderTreeSelectOpenUpload: boolean
  folderTreeSelectOpenString: boolean
  
  // Create folder form state
  showCreateFolderForm: boolean
  folderInputMode: "tree" | "string"
  newFolderName: string
  parentFolderForCreate: string | null
  folderPathString: string
  rootFolderForString: string | null
  
  // Actions
  setViewMode: (mode: "flat" | "tree") => void
  setCurrentPage: (page: number) => void
  setSelectedImages: (images: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  setSelectedFolder: (folder: string | null) => void
  toggleImageSelection: (fileName: string) => void
  selectAllImages: (images: ImageItem[]) => void
  clearSelection: () => void
  
  // Folder tree actions
  setOpenFolders: (folders: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  toggleFolder: (path: string) => void
  setOpenFolderPaths: (paths: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  setOpenFolderPathsUpload: (paths: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  setOpenFolderPathsString: (paths: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  
  // Popover actions
  setFolderTreeSelectOpen: (open: boolean) => void
  setFolderTreeSelectOpenUpload: (open: boolean) => void
  setFolderTreeSelectOpenString: (open: boolean) => void
  
  // Create folder form actions
  setShowCreateFolderForm: (show: boolean) => void
  setFolderInputMode: (mode: "tree" | "string") => void
  setNewFolderName: (name: string) => void
  setParentFolderForCreate: (path: string | null) => void
  setFolderPathString: (path: string) => void
  setRootFolderForString: (path: string | null) => void
  resetCreateFolderForm: () => void
}

// Helper to update Set state (supports function or value)
const updateSet = <T>(
  current: Set<T>,
  update: Set<T> | ((prev: Set<T>) => Set<T>)
): Set<T> => (typeof update === "function" ? update(current) : update)

// Helper to toggle Set item
const toggleSetItem = <T>(set: Set<T>, item: T): Set<T> => {
  const newSet = new Set(set)
  if (newSet.has(item)) newSet.delete(item)
  else newSet.add(item)
  return newSet
}

const initialState = {
  viewMode: "tree" as const,
  currentPage: 1,
  selectedImages: new Set<string>(),
  selectedFolder: null as string | null,
  openFolders: new Set<string>(),
  openFolderPaths: new Set<string>(),
  openFolderPathsUpload: new Set<string>(),
  openFolderPathsString: new Set<string>(),
  folderTreeSelectOpen: false,
  folderTreeSelectOpenUpload: false,
  folderTreeSelectOpenString: false,
  showCreateFolderForm: false,
  folderInputMode: "tree" as const,
  newFolderName: "",
  parentFolderForCreate: null as string | null,
  folderPathString: "",
  rootFolderForString: null as string | null,
}

export const useUploadsStore = create<UploadsUIState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        // View actions
        setViewMode: (mode) => set({ viewMode: mode }),
        setCurrentPage: (page) => set({ currentPage: page }),
        
        // Selection actions
        setSelectedImages: (images) =>
          set((state) => ({ selectedImages: updateSet(state.selectedImages, images) })),
        setSelectedFolder: (folder) => set({ selectedFolder: folder }),
        toggleImageSelection: (fileName) =>
          set((state) => ({ selectedImages: toggleSetItem(state.selectedImages, fileName) })),
        selectAllImages: (images) =>
          set({ selectedImages: new Set(images.map((img) => img.fileName)) }),
        clearSelection: () => set({ selectedImages: new Set() }),
        
        // Folder tree actions
        setOpenFolders: (folders) =>
          set((state) => ({ openFolders: updateSet(state.openFolders, folders) })),
        toggleFolder: (path) =>
          set((state) => ({ openFolders: toggleSetItem(state.openFolders, path) })),
        setOpenFolderPaths: (paths) =>
          set((state) => ({ openFolderPaths: updateSet(state.openFolderPaths, paths) })),
        setOpenFolderPathsUpload: (paths) =>
          set((state) => ({ openFolderPathsUpload: updateSet(state.openFolderPathsUpload, paths) })),
        setOpenFolderPathsString: (paths) =>
          set((state) => ({ openFolderPathsString: updateSet(state.openFolderPathsString, paths) })),
        
        // Popover actions
        setFolderTreeSelectOpen: (open) => set({ folderTreeSelectOpen: open }),
        setFolderTreeSelectOpenUpload: (open) => set({ folderTreeSelectOpenUpload: open }),
        setFolderTreeSelectOpenString: (open) => set({ folderTreeSelectOpenString: open }),
        
        // Create folder form actions
        setShowCreateFolderForm: (show) => set({ showCreateFolderForm: show }),
        setFolderInputMode: (mode) => set({ folderInputMode: mode }),
        setNewFolderName: (name) => set({ newFolderName: name }),
        setParentFolderForCreate: (path) => set({ parentFolderForCreate: path }),
        setFolderPathString: (path) => set({ folderPathString: path }),
        setRootFolderForString: (path) => set({ rootFolderForString: path }),
        resetCreateFolderForm: () =>
          set({
            newFolderName: "",
            parentFolderForCreate: null,
            folderPathString: "",
            rootFolderForString: null,
            folderInputMode: "tree",
          }),
      }),
      {
        name: "uploads-ui-store",
        // Only persist important state
        partialize: (state) => ({
          viewMode: state.viewMode,
          selectedFolder: state.selectedFolder,
          // Don't persist selection and open states as they change frequently
        }),
      }
    ),
    { name: "UploadsStore" }
  )
)

