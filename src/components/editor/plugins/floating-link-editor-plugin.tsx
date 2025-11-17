"use client"

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { Dispatch, JSX, useCallback, useEffect, useRef, useState } from "react"
import {
  $createLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  TOGGLE_LINK_COMMAND,
} from "@lexical/link"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $findMatchingParent, $wrapNodeInElement, mergeRegister } from "@lexical/utils"
import {
  $getSelection,
  $isLineBreakNode,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  BaseSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from "lexical"
import { Check, Pencil, Trash, X } from "lucide-react"
import { createPortal } from "react-dom"

import { getSelectedNode } from "@/components/editor/utils/get-selected-node"
import { setFloatingElemPositionForLinkEditor } from "@/components/editor/utils/set-floating-elem-position-for-link-editor"
import { sanitizeUrl, validateUrl } from "@/components/editor/utils/url"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { $isImageNode } from "@/components/editor/nodes/image-node"

function FloatingLinkEditor({
  editor,
  isLink,
  setIsLink,
  anchorElem,
  isLinkEditMode,
  setIsLinkEditMode,
}: {
  editor: LexicalEditor
  isLink: boolean
  setIsLink: Dispatch<boolean>
  anchorElem: HTMLElement
  isLinkEditMode: boolean
  setIsLinkEditMode: Dispatch<boolean>
}): JSX.Element {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [editedLinkUrl, setEditedLinkUrl] = useState("https://")
  const [lastSelection, setLastSelection] = useState<BaseSelection | null>(null)

  const $updateLinkEditor = useCallback(() => {
    const selection = $getSelection()
    let linkNode = null
    let selectedNode = null

    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection)
      selectedNode = node
      linkNode = $findMatchingParent(node, $isLinkNode)
      if (!linkNode && $isLinkNode(node)) {
        linkNode = node
      }
    } else if ($isNodeSelection(selection)) {
      const nodes = selection.getNodes()
      if (nodes.length > 0) {
        const node = nodes[0]
        selectedNode = node
        // Check if the node itself is a link node
        if ($isLinkNode(node)) {
          linkNode = node
        } else {
          // Check if the node is wrapped in a link (e.g., image node in link)
          linkNode = $findMatchingParent(node, $isLinkNode)
          // For image nodes, also check if parent is a link
          if (!linkNode && $isImageNode(node)) {
            const parent = node.getParent()
            if ($isLinkNode(parent)) {
              linkNode = parent
            }
          }
        }
      }
    }

    if (linkNode) {
      setLinkUrl(linkNode.getURL())
    } else {
      setLinkUrl("")
    }

    if (isLinkEditMode && linkNode) {
      setEditedLinkUrl(linkUrl || linkNode.getURL())
    }

    const editorElem = editorRef.current
    const nativeSelection = window.getSelection()
    const activeElement = document.activeElement

    if (editorElem === null) {
      return
    }

    const rootElement = editor.getRootElement()

    // Check if we have a valid selection (with or without link)
    const hasValidSelection = selection !== null
    const hasValidNativeSelection = 
      nativeSelection !== null && 
      rootElement !== null &&
      (nativeSelection.anchorNode && rootElement.contains(nativeSelection.anchorNode))

    // Show floating editor if:
    // 1. We have a link node (existing link) - show to view/edit
    // 2. We're in edit mode (creating new link) - show input to create link
    const hasImageNode = $isNodeSelection(selection) && selectedNode && $isImageNode(selectedNode)
    const shouldShowEditor = 
      (linkNode !== null || isLinkEditMode) &&
      hasValidSelection &&
      editor.isEditable() &&
      (
        // If in edit mode, always show (even if nativeSelection is not valid)
        isLinkEditMode ||
        hasValidNativeSelection || 
        ($isNodeSelection(selection) && selectedNode) ||
        ($isRangeSelection(selection) && selection.getTextContent().length > 0)
      )

    if (shouldShowEditor) {
      // For node selection (e.g., image), try to get the DOM element
      let domRect: DOMRect | undefined
      
      if ($isNodeSelection(selection) && selectedNode) {
        // Try to get DOM element using node key
        const nodeKey = selectedNode.getKey()
        const nodeElement = editor.getElementByKey(nodeKey)
        
        if (nodeElement) {
          // For image nodes wrapped in links, find the link element
          if ($isImageNode(selectedNode) && linkNode) {
            // Find the link element that wraps the image
            const linkElement = nodeElement.closest("a") || nodeElement.parentElement?.closest("a")
            if (linkElement) {
              domRect = linkElement.getBoundingClientRect()
            } else {
              domRect = nodeElement.getBoundingClientRect()
            }
          } else {
            domRect = nodeElement.getBoundingClientRect()
          }
        }
      }
      
      // Fallback to native selection if we don't have a specific DOM rect
      if (!domRect && nativeSelection) {
        // Try to find link element in DOM if we have a link node
        if (linkNode && nativeSelection.focusNode) {
          // focusNode can be a Text node, so we need to get the parent element
          let focusElement: HTMLElement | null = null
          if (nativeSelection.focusNode instanceof HTMLElement) {
            focusElement = nativeSelection.focusNode
          } else if (nativeSelection.focusNode.parentElement) {
            focusElement = nativeSelection.focusNode.parentElement
          }
          
          if (focusElement) {
            const linkElement = focusElement.closest("a") || focusElement.parentElement?.closest("a")
            if (linkElement) {
              domRect = linkElement.getBoundingClientRect()
            }
          }
        }
        if (!domRect && nativeSelection.focusNode) {
          // Get parent element if focusNode is not an HTMLElement
          const parentElement = nativeSelection.focusNode instanceof HTMLElement
            ? nativeSelection.focusNode
            : nativeSelection.focusNode.parentElement
          if (parentElement) {
            domRect = parentElement.getBoundingClientRect()
          }
        }
      }

      // If in edit mode but no domRect, try to get from range selection
      if (!domRect && isLinkEditMode && $isRangeSelection(selection)) {
        const range = nativeSelection?.getRangeAt(0)
        if (range) {
          domRect = range.getBoundingClientRect()
        }
      }

      if (domRect) {
        domRect.y += 40
        setFloatingElemPositionForLinkEditor(domRect, editorElem, anchorElem)
      } else if (isLinkEditMode) {
        // If in edit mode but no domRect, show editor at a default position
        // Use a fallback position based on editor root
        if (rootElement) {
          const rootRect = rootElement.getBoundingClientRect()
          const fallbackRect = new DOMRect(
            rootRect.left + 20,
            rootRect.top + 100,
            300,
            50
          )
          setFloatingElemPositionForLinkEditor(fallbackRect, editorElem, anchorElem)
        }
      }
      setLastSelection(selection)
    } else if (!activeElement || activeElement.className !== "link-input") {
      if (rootElement !== null) {
        setFloatingElemPositionForLinkEditor(null, editorElem, anchorElem)
      }
      setLastSelection(null)
      setIsLinkEditMode(false)
      if (!linkNode) {
        setLinkUrl("")
      }
    }

    return true
  }, [anchorElem, editor, setIsLinkEditMode, isLinkEditMode, linkUrl])

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement

    const update = () => {
      editor.getEditorState().read(() => {
        $updateLinkEditor()
      })
    }

    window.addEventListener("resize", update)

    if (scrollerElem) {
      scrollerElem.addEventListener("scroll", update)
    }

    return () => {
      window.removeEventListener("resize", update)

      if (scrollerElem) {
        scrollerElem.removeEventListener("scroll", update)
      }
    }
  }, [anchorElem.parentElement, editor, $updateLinkEditor])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateLinkEditor()
        })
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateLinkEditor()
          return true
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (isLink) {
            setIsLink(false)
            return true
          }
          return false
        },
        COMMAND_PRIORITY_HIGH
      )
    )
  }, [editor, $updateLinkEditor, setIsLink, isLink])

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateLinkEditor()
    })
  }, [editor, $updateLinkEditor])

  useEffect(() => {
    if (isLinkEditMode && inputRef.current) {
      inputRef.current.focus()
      // Use setTimeout to avoid calling setState synchronously within effect
      setTimeout(() => {
        setIsLink(true)
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLinkEditMode, isLink])

  const monitorInputInteraction = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleLinkSubmission()
    } else if (event.key === "Escape") {
      event.preventDefault()
      setIsLinkEditMode(false)
    }
  }

  const handleLinkSubmission = () => {
    const url = sanitizeUrl(editedLinkUrl)
    if (url && url !== "https://" && url !== "http://") {
      editor.update(() => {
        // Try to get current selection first
        let selection = $getSelection()
        
        // If no current selection, try to restore from lastSelection
        if (!selection && lastSelection !== null) {
          // Clone the selection to avoid frozen object error
          if ($isRangeSelection(lastSelection)) {
            const clonedSelection = lastSelection.clone()
            $setSelection(clonedSelection)
            selection = $getSelection()
          } else if ($isNodeSelection(lastSelection)) {
            const clonedSelection = lastSelection.clone()
            $setSelection(clonedSelection)
            selection = $getSelection()
          }
        }
        
        if (!selection) {
          return
        }
        
        // Handle node selection (e.g., image nodes)
        if ($isNodeSelection(selection)) {
          const nodes = selection.getNodes()
          if (nodes.length > 0) {
            const node = nodes[0]
            
            // If it's an image node
            if ($isImageNode(node)) {
              // Check if already wrapped in a link
              const existingLinkNode = $findMatchingParent(node, $isLinkNode) || 
                ($isLinkNode(node.getParent()) ? node.getParent() : null)
              
              if (existingLinkNode) {
                // Update existing link
                existingLinkNode.setURL(url)
              } else {
                // Wrap image in link using wrapNodeInElement (safe for all cases including root)
                const linkNode = $createLinkNode(url)
                $wrapNodeInElement(node, () => linkNode)
              }
            }
          }
        }
        // Handle range selection
        else if ($isRangeSelection(selection)) {
          // Use default TOGGLE_LINK_COMMAND for range selection
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
          const parent = getSelectedNode(selection).getParent()
          if ($isAutoLinkNode(parent)) {
            const linkNode = $createLinkNode(parent.getURL(), {
              rel: parent.__rel,
              target: parent.__target,
              title: parent.__title,
            })
            parent.replace(linkNode, true)
          }
        }
      })
      setEditedLinkUrl("https://")
      setIsLinkEditMode(false)
    }
  }
  return (
    <div
      ref={editorRef}
      className="absolute top-0 left-0 w-full max-w-sm rounded-md opacity-0 shadow-lg z-50"
    >
      {isLinkEditMode || isLink ? (
        isLinkEditMode ? (
          <div className="flex items-center space-x-2 rounded-md border bg-background/95 backdrop-blur-sm p-1 pl-2 shadow-lg">
          <Input
            ref={inputRef}
            value={editedLinkUrl}
            onChange={(event) => setEditedLinkUrl(event.target.value)}
            onKeyDown={monitorInputInteraction}
            className="flex-grow"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setIsLinkEditMode(false)
              setIsLink(false)
            }}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleLinkSubmission}
            className="shrink-0"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border bg-background/95 backdrop-blur-sm p-1 pl-2 shadow-lg">
          <a
            href={sanitizeUrl(linkUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="overflow-hidden text-sm text-ellipsis whitespace-nowrap"
          >
            {linkUrl}
          </a>
          <div className="flex">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditedLinkUrl(linkUrl)
                setIsLinkEditMode(true)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              onClick={() => {
                editor.update(() => {
                  const selection = $getSelection()
                  // Handle node selection (e.g., image nodes)
                  if ($isNodeSelection(selection)) {
                    const nodes = selection.getNodes()
                    if (nodes.length > 0) {
                      const node = nodes[0]
                        if ($isImageNode(node)) {
                          const linkNode = $findMatchingParent(node, $isLinkNode) || 
                            ($isLinkNode(node.getParent()) ? node.getParent() : null)
                          if (linkNode) {
                            // Remove link by unwrapping - insert children into parent and remove link
                            const parent = linkNode.getParent()
                            if (parent) {
                              const children = linkNode.getChildren()
                              children.forEach((child) => {
                                linkNode.insertBefore(child)
                              })
                              linkNode.remove()
                            }
                          }
                        }
                    }
                  } else {
                    // Use default TOGGLE_LINK_COMMAND for range selection
                    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
                  }
                })
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
        )
      ) : null}
    </div>
  )
}

function useFloatingLinkEditorToolbar(
  editor: LexicalEditor,
  anchorElem: HTMLDivElement | null,
  isLinkEditMode: boolean,
  setIsLinkEditMode: Dispatch<boolean>
): JSX.Element | null {
  const [activeEditor, setActiveEditor] = useState(editor)
  const [isLink, setIsLink] = useState(false)

  useEffect(() => {
    function $updateToolbar() {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const focusNode = getSelectedNode(selection)
        const focusLinkNode = $findMatchingParent(focusNode, $isLinkNode)
        const focusAutoLinkNode = $findMatchingParent(
          focusNode,
          $isAutoLinkNode
        )
        if (!(focusLinkNode || focusAutoLinkNode)) {
          setIsLink(false)
          return
        }
        const badNode = selection
          .getNodes()
          .filter((node) => !$isLineBreakNode(node))
          .find((node) => {
            const linkNode = $findMatchingParent(node, $isLinkNode)
            const autoLinkNode = $findMatchingParent(node, $isAutoLinkNode)
            return (
              (focusLinkNode && !focusLinkNode.is(linkNode)) ||
              (linkNode && !linkNode.is(focusLinkNode)) ||
              (focusAutoLinkNode && !focusAutoLinkNode.is(autoLinkNode)) ||
              (autoLinkNode &&
                (!autoLinkNode.is(focusAutoLinkNode) ||
                  autoLinkNode.getIsUnlinked()))
            )
          })
        if (!badNode) {
          setIsLink(true)
        } else {
          setIsLink(false)
        }
      } else if ($isNodeSelection(selection)) {
        const nodes = selection.getNodes()
        if (nodes.length === 0) {
          setIsLink(false)
          return
        }
        const node = nodes[0]
        // Check if node itself is a link
        if ($isLinkNode(node)) {
          setIsLink(true)
          return
        }
        // Check if node is wrapped in a link (using $findMatchingParent for better traversal)
        const linkParent = $findMatchingParent(node, $isLinkNode)
        if (linkParent) {
          setIsLink(true)
          return
        }
        // For image nodes, also check direct parent
        if ($isImageNode(node)) {
          const parent = node.getParent()
          if ($isLinkNode(parent)) {
            setIsLink(true)
            return
          }
        }
        setIsLink(false)
      }
    }
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar()
        })
      }),
      // Register TOGGLE_LINK_COMMAND handler for node selection (image nodes)
      editor.registerCommand(
        TOGGLE_LINK_COMMAND,
        (url: string | null) => {
          const selection = $getSelection()
          
          // Handle node selection (e.g., image nodes)
          if ($isNodeSelection(selection)) {
            const nodes = selection.getNodes()
            if (nodes.length > 0) {
              const node = nodes[0]
              
              if ($isImageNode(node)) {
                if (url) {
                  // Create or update link
                  const existingLinkNode = $findMatchingParent(node, $isLinkNode) || 
                    ($isLinkNode(node.getParent()) ? node.getParent() : null)
                  
                  if (existingLinkNode) {
                    // Update existing link
                    existingLinkNode.setURL(url)
                  } else {
                    // Wrap image in link using wrapNodeInElement (safe for all cases including root)
                    const linkNode = $createLinkNode(url)
                    $wrapNodeInElement(node, () => linkNode)
                  }
                } else {
                  // Remove link
                  const linkNode = $findMatchingParent(node, $isLinkNode) || 
                    ($isLinkNode(node.getParent()) ? node.getParent() : null)
                  if (linkNode) {
                    // Remove link by unwrapping - insert children into parent and remove link
                    const parent = linkNode.getParent()
                    if (parent) {
                      const children = linkNode.getChildren()
                      children.forEach((child) => {
                        linkNode.insertBefore(child)
                      })
                      linkNode.remove()
                    }
                  }
                }
                return true
              }
            }
          }
          
          // Let default handler process range selection
          return false
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, newEditor) => {
          editor.getEditorState().read(() => {
            $updateToolbar()
          })
          setActiveEditor(newEditor)
          return false
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      // Register a listener for when node selection changes to image with link
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          editor.getEditorState().read(() => {
            const selection = $getSelection()
            if ($isNodeSelection(selection)) {
              const nodes = selection.getNodes()
              if (nodes.length > 0) {
                const node = nodes[0]
                if ($isImageNode(node)) {
                  const linkNode = $findMatchingParent(node, $isLinkNode) || 
                    ($isLinkNode(node.getParent()) ? node.getParent() : null)
                  if (linkNode) {
                    // Delay to ensure DOM is updated
                    setTimeout(() => {
                      editor.getEditorState().read(() => {
                        $updateToolbar()
                      })
                    }, 10)
                  }
                }
              }
            }
          })
          return false
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        CLICK_COMMAND,
        (payload) => {
          let shouldReturnTrue = false
          
          editor.getEditorState().read(() => {
            const selection = $getSelection()
            
            // Check if we clicked on an image node (with or without link)
            let hasImageNode = false
            if ($isNodeSelection(selection)) {
              const nodes = selection.getNodes()
              if (nodes.length > 0) {
                const node = nodes[0]
                if ($isImageNode(node)) {
                  hasImageNode = true
                }
              }
            }
            
            // Handle Ctrl/Cmd + click to open link
            if (payload.metaKey || payload.ctrlKey) {
              if ($isRangeSelection(selection)) {
                const node = getSelectedNode(selection)
                const linkNode = $findMatchingParent(node, $isLinkNode)
                if ($isLinkNode(linkNode)) {
                  const url = linkNode.getURL()
                  // Validate URL before opening to prevent errors with invalid URLs
                  if (url && validateUrl(url)) {
                    window.open(url, "_blank")
                  }
                  shouldReturnTrue = true
                  return
                }
              } else if ($isNodeSelection(selection)) {
                const nodes = selection.getNodes()
                if (nodes.length > 0) {
                  const node = nodes[0]
                  let linkNode = null
                  if ($isLinkNode(node)) {
                    linkNode = node
                  } else {
                    linkNode = $findMatchingParent(node, $isLinkNode)
                    if (!linkNode && $isImageNode(node)) {
                      const parent = node.getParent()
                      if ($isLinkNode(parent)) {
                        linkNode = parent
                      }
                    }
                  }
                  if (linkNode) {
                    const url = linkNode.getURL()
                    if (url && validateUrl(url)) {
                      window.open(url, "_blank")
                    }
                    shouldReturnTrue = true
                    return
                  }
                }
              }
            }
            
            // If we clicked on an image (with or without link), trigger toolbar update
            if (hasImageNode) {
              // Use requestAnimationFrame to ensure selection is updated
              requestAnimationFrame(() => {
                editor.getEditorState().read(() => {
                  $updateToolbar()
                })
              })
            }
          })
          
          if (shouldReturnTrue) {
            return true
          }
          
          // Trigger toolbar update on click to ensure floating editor shows
          setTimeout(() => {
            editor.getEditorState().read(() => {
              $updateToolbar()
            })
          }, 0)
          return false
        },
        COMMAND_PRIORITY_HIGH
      )
    )
  }, [editor])

  if (!anchorElem) {
    return null
  }

  return createPortal(
    <FloatingLinkEditor
      editor={activeEditor}
      isLink={isLink}
      anchorElem={anchorElem}
      setIsLink={setIsLink}
      isLinkEditMode={isLinkEditMode}
      setIsLinkEditMode={setIsLinkEditMode}
    />,
    anchorElem
  )
}

export function FloatingLinkEditorPlugin({
  anchorElem,
  isLinkEditMode,
  setIsLinkEditMode,
}: {
  anchorElem: HTMLDivElement | null
  isLinkEditMode: boolean
  setIsLinkEditMode: Dispatch<boolean>
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext()

  return useFloatingLinkEditorToolbar(
    editor,
    anchorElem,
    isLinkEditMode,
    setIsLinkEditMode
  )
}
