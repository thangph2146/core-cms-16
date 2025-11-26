"use client"

import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search } from "lucide-react"
import type { Contact } from "../types"
import { ContactItem } from "./contact-item"

interface ContactListProps {
  contacts: Contact[]
  selectedContactId?: string
  onContactSelect: (contact: Contact) => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  width?: number
}

export function ContactList({ contacts, selectedContactId, onContactSelect, searchValue = "", onSearchChange, width }: ContactListProps) {
  return (
    <div 
      className="max-w-[100dvw] mx-auto" 
      id="contact-list"
      style={width ? { width: `${width}px` } : undefined}
    >
      <div className="relative px-4 py-3 border-b shrink-0">
        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm liên hệ..."
          className="pl-9 h-9"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>
      <ScrollArea className="w-full max-h-[calc(100dvh-12.5rem)]"
      style={width ? { width: `${width}px` } : undefined}>
        <div className="divide-y" style={width ? { width: `${width}px` } : undefined}>
          {contacts.map((contact) => (
            <ContactItem
              key={contact.id}
              contact={contact}
              isSelected={selectedContactId === contact.id}
              onClick={() => onContactSelect(contact)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
