"use client"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"
import { AutoEmbedDialogStandalone, EmbedConfigs } from "@/components/editor/plugins/embeds/auto-embed-plugin"
import { SelectItem } from "@/components/ui/select"

export function InsertEmbeds() {
  const { activeEditor, showModal } = useToolbarContext()
  return EmbedConfigs.map((embedConfig) => (
    <SelectItem
      key={embedConfig.type}
      value={embedConfig.type}
      onPointerUp={() => {
        showModal(`Embed ${embedConfig.contentName}`, (onClose) => (
          <AutoEmbedDialogStandalone 
            embedConfig={embedConfig} 
            onClose={onClose} 
            editor={activeEditor}
          />
        ))
      }}
      className=""
    >
      <div className="flex items-center gap-1">
        {embedConfig.icon}
        <span>{embedConfig.contentName}</span>
      </div>
    </SelectItem>
  ))
}
