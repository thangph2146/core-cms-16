"use client"

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useBasicTypeaheadTriggerMatch } from "@lexical/react/LexicalTypeaheadMenuPlugin"
import { TextNode } from "lexical"
import { createPortal } from "react-dom"

import { useEditorModal } from "@/components/editor/editor-hooks/use-modal"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { logger } from "@/lib/config/logger"

import { ComponentPickerOption } from "./picker/component-picker-option"

// Component wrapper để xử lý scroll tự động
function MenuContent({
  options,
  selectedIndex,
  selectOptionAndCleanUp,
  setHighlightedIndex,
}: {
  options: Array<ComponentPickerOption>
  selectedIndex: number | null
  selectOptionAndCleanUp: (option: ComponentPickerOption) => void
  setHighlightedIndex: (index: number) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Scroll to selected item when selectedIndex changes
  useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= 0 && selectedIndex < options.length) {
      // Sử dụng setTimeout để đảm bảo DOM đã được render và cmdk đã update selected state
      const timeoutId = setTimeout(() => {
        const container = containerRef.current
        if (!container) {
          logger.debug("MenuContent: No container ref", { selectedIndex })
          return
        }

        // Tìm item được chọn bằng cách tìm element có data-selected="true" hoặc aria-selected="true"
        let selectedItem = container.querySelector(
          '[data-selected="true"], [aria-selected="true"]'
        ) as HTMLElement

        // Fallback: nếu không tìm thấy bằng attribute, tìm theo index
        if (!selectedItem) {
          const allItems = container.querySelectorAll('[data-slot="command-item"]')
          selectedItem = allItems[selectedIndex] as HTMLElement
          logger.debug("MenuContent: Found item by index", {
            selectedIndex,
            totalItems: allItems.length,
            found: !!selectedItem,
          })
        } else {
          logger.debug("MenuContent: Found item by attribute", { selectedIndex })
        }

        if (selectedItem) {
          // Tìm ScrollArea viewport
          const scrollContainer = container.querySelector(
            '[data-radix-scroll-area-viewport]'
          ) as HTMLElement

          if (scrollContainer) {
            const currentScrollTop = scrollContainer.scrollTop
            const containerHeight = scrollContainer.clientHeight
            const scrollHeight = scrollContainer.scrollHeight

            // Tìm tất cả items để tính offset
            const allItems = container.querySelectorAll('[data-slot="command-item"]')
            let itemOffsetTop = 0

            // Tính offset của item bằng cách cộng offsetHeight của tất cả items trước nó
            for (let i = 0; i < selectedIndex && i < allItems.length; i++) {
              const item = allItems[i] as HTMLElement
              itemOffsetTop += item.offsetHeight || 32 // Default height nếu không có
            }

            // Thêm padding của CommandGroup nếu có
            const commandGroup = selectedItem.closest('[data-slot="command-group"]') as HTMLElement
            if (commandGroup) {
              const groupStyle = window.getComputedStyle(commandGroup)
              const paddingTop = parseFloat(groupStyle.paddingTop) || 0
              itemOffsetTop += paddingTop
            }

            const itemHeight = selectedItem.offsetHeight || 32
            const itemRect = selectedItem.getBoundingClientRect()
            const containerRect = scrollContainer.getBoundingClientRect()

            logger.debug("MenuContent: Scrolling to item", {
              selectedIndex,
              currentScrollTop,
              containerHeight,
              scrollHeight,
              itemOffsetTop,
              itemHeight,
              itemTop: itemRect.top,
              containerTop: containerRect.top,
              itemVisible: itemRect.top >= containerRect.top && itemRect.bottom <= containerRect.bottom,
            })

            // Kiểm tra xem item có đang visible trong viewport không
            const isItemVisible = itemRect.top >= containerRect.top && itemRect.bottom <= containerRect.bottom
            const itemNearTop = itemRect.top < containerRect.top + 20
            const itemNearBottom = itemRect.bottom > containerRect.bottom - 20

            // Tính toán scroll position để item nằm ở giữa container
            let targetScrollTop = itemOffsetTop - containerHeight / 2 + itemHeight / 2

            // Tính maxScroll dựa trên tổng chiều cao của tất cả items
            // Nếu scrollHeight === containerHeight, tính toán dựa trên items
            let calculatedMaxScroll = scrollHeight - containerHeight
            if (calculatedMaxScroll <= 0 && allItems.length > 0) {
              // Tính tổng chiều cao của tất cả items
              let totalHeight = 0
              for (let i = 0; i < allItems.length; i++) {
                const item = allItems[i] as HTMLElement
                totalHeight += item.offsetHeight || 32
              }
              // Thêm padding của CommandGroup
              if (commandGroup) {
                const groupStyle = window.getComputedStyle(commandGroup)
                const paddingTop = parseFloat(groupStyle.paddingTop) || 0
                const paddingBottom = parseFloat(groupStyle.paddingBottom) || 0
                totalHeight += paddingTop + paddingBottom
              }
              calculatedMaxScroll = Math.max(0, totalHeight - containerHeight)
            }

            // Đảm bảo không scroll quá đầu hoặc cuối
            targetScrollTop = Math.max(0, Math.min(targetScrollTop, calculatedMaxScroll))

            // Scroll nếu item không visible hoặc gần edge
            const needsScroll = !isItemVisible || itemNearTop || itemNearBottom

            if (needsScroll && Math.abs(targetScrollTop - currentScrollTop) > 1 && calculatedMaxScroll > 0) {
              scrollContainer.scrollTo({
                top: targetScrollTop,
                behavior: "smooth",
              })

              logger.debug("MenuContent: Scrolled", {
                selectedIndex,
                fromScrollTop: currentScrollTop,
                toScrollTop: targetScrollTop,
                itemOffsetTop,
                calculatedMaxScroll,
                scrollHeight,
                containerHeight,
                needsScroll,
              })
            } else {
              logger.debug("MenuContent: No scroll needed", {
                selectedIndex,
                currentScrollTop,
                targetScrollTop,
                itemOffsetTop,
                isItemVisible,
                itemNearTop,
                itemNearBottom,
                scrollHeight,
                containerHeight,
                calculatedMaxScroll,
              })
            }
          } else {
            // Fallback: scroll directly
            logger.debug("MenuContent: No scroll container, scrolling directly", {
              selectedIndex,
            })
            selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" })
          }
        } else {
          logger.warn("MenuContent: Could not find selected item", { selectedIndex })
        }
      }, 10) // Tăng delay một chút để đảm bảo cmdk đã update state

      return () => clearTimeout(timeoutId)
    }
  }, [selectedIndex, options.length])

  return (
    <div ref={containerRef}>
      <Command
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault()
            setHighlightedIndex(
              selectedIndex !== null
                ? (selectedIndex - 1 + options.length) % options.length
                : options.length - 1
            )
          } else if (e.key === "ArrowDown") {
            e.preventDefault()
            setHighlightedIndex(
              selectedIndex !== null ? (selectedIndex + 1) % options.length : 0
            )
          }
        }}
      >
        <CommandList>
          <CommandGroup>
            {options.map((option, index) => (
              <CommandItem
                key={option.key}
                value={option.title}
                onSelect={() => {
                  selectOptionAndCleanUp(option)
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                {option.icon}
                <span>{option.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}

const LexicalTypeaheadMenuPlugin = dynamic(
  () =>
    import("@lexical/react/LexicalTypeaheadMenuPlugin").then(
      (mod) => mod.LexicalTypeaheadMenuPlugin<ComponentPickerOption>
    ),
  { ssr: false }
)

export function ComponentPickerMenuPlugin({
  baseOptions = [],
  dynamicOptionsFn,
}: {
  baseOptions?: Array<ComponentPickerOption>
  dynamicOptionsFn?: ({
    queryString,
  }: {
    queryString: string
  }) => Array<ComponentPickerOption>
}): JSX.Element {
  const [editor] = useLexicalComposerContext()
  const [modal, showModal] = useEditorModal()
  const [queryString, setQueryString] = useState<string | null>(null)

  logger.debug("ComponentPickerMenuPlugin initialized", {
    baseOptionsCount: baseOptions.length,
    hasDynamicOptionsFn: !!dynamicOptionsFn,
  })

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  })

  const options = useMemo(() => {
    if (!queryString) {
      logger.debug("ComponentPickerMenuPlugin: No query string, returning baseOptions", {
        baseOptionsCount: baseOptions.length,
        baseOptionsTitles: baseOptions.map((opt) => opt.title),
      })
      return baseOptions
    }

    logger.debug("ComponentPickerMenuPlugin: Filtering options", {
      queryString,
      baseOptionsCount: baseOptions.length,
    })

    const regex = new RegExp(queryString, "i")

    const filtered = [
      ...(dynamicOptionsFn?.({ queryString }) || []),
      ...baseOptions.filter(
        (option) =>
          regex.test(option.title) ||
          option.keywords.some((keyword) => regex.test(keyword))
      ),
    ]
    
    logger.debug("ComponentPickerMenuPlugin: Filtered options", {
      filteredCount: filtered.length,
      filteredTitles: filtered.map((opt) => opt.title),
    })
    
    return filtered
  }, [baseOptions, dynamicOptionsFn, queryString])

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string
    ) => {
      editor.update(() => {
        nodeToRemove?.remove()
        selectedOption.onSelect(matchingString, editor, showModal)
        closeMenu()
      })
    },
    [editor, showModal]
  )

  return (
    <>
      {modal}
      <LexicalTypeaheadMenuPlugin
        onQueryChange={(query) => {
          logger.debug("ComponentPickerMenuPlugin: Query changed", { query })
          setQueryString(query)
        }}
        onSelectOption={onSelectOption}
        triggerFn={(text, editor) => {
          const match = checkForTriggerMatch(text, editor)
          logger.debug("ComponentPickerMenuPlugin: Trigger check", {
            text,
            hasMatch: !!match,
            matchString: match?.matchingString,
          })
          return match
        }}
        options={options}
        menuRenderFn={(
          anchorElementRef,
          { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
        ) => {
          logger.debug("ComponentPickerMenuPlugin: menuRenderFn called", {
            hasAnchorElement: !!anchorElementRef.current,
            optionsLength: options.length,
            selectedIndex,
          })

          if (!anchorElementRef.current) {
            logger.warn("ComponentPickerMenuPlugin: No anchor element", {
              anchorElementRef: anchorElementRef.current,
            })
            return null
          }

          if (!options.length) {
            logger.warn("ComponentPickerMenuPlugin: No options available", {
              optionsLength: options.length,
            })
            return null
          }

          const anchorRect = anchorElementRef.current.getBoundingClientRect()
          const menuHeight = Math.min(options.length * 40 + 16, 300)
          const viewportHeight = window.innerHeight
          const viewportWidth = window.innerWidth
          
          // Với fixed positioning, sử dụng getBoundingClientRect() đã trả về vị trí relative to viewport
          // Không cần cộng window.scrollY vì fixed position đã relative to viewport
          let top = anchorRect.bottom + 4
          if (top + menuHeight > viewportHeight) {
            top = anchorRect.top - menuHeight - 4
          }
          
          // Đảm bảo menu không bị tràn ra ngoài viewport
          top = Math.max(4, Math.min(top, viewportHeight - menuHeight - 4))
          
          // Tính toán left position, đảm bảo menu không bị tràn ra ngoài viewport
          let left = anchorRect.left
          const menuWidth = 250
          if (left + menuWidth > viewportWidth) {
            left = viewportWidth - menuWidth - 4
          }
          left = Math.max(4, left)
          
          const menuPosition = {
            top: `${top}px`,
            left: `${left}px`,
          }

          logger.debug("ComponentPickerMenuPlugin: Rendering menu", {
            menuPosition,
            anchorRect: {
              top: anchorRect.top,
              left: anchorRect.left,
              bottom: anchorRect.bottom,
              right: anchorRect.right,
              width: anchorRect.width,
              height: anchorRect.height,
            },
            viewport: {
              height: viewportHeight,
              width: viewportWidth,
            },
            optionsCount: options.length,
          })
          
          return createPortal(
            <div 
              className="fixed z-[100] w-[250px] rounded-md border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden"
              style={{
                top: `${top}px`,
                left: `${left}px`,
                maxHeight: "300px",
                position: "fixed",
                visibility: "visible",
                opacity: 1,
              }}
                          >
              <MenuContent
                options={options}
                selectedIndex={selectedIndex}
                selectOptionAndCleanUp={selectOptionAndCleanUp}
                setHighlightedIndex={setHighlightedIndex}
              />
                </div>,
            document.body
              )
        }}
      />
    </>
  )
}
