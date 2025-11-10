/**
 * Helper functions cho contact operations
 */

import type { Contact, ChatFilterType } from "../types"

/**
 * Filter contacts by filter type
 */
export function filterContacts(
  contacts: Contact[],
  filterType: ChatFilterType
): Contact[] {
  if (filterType === "ACTIVE") {
    return contacts.filter((contact) => !contact.isDeleted)
  }
  if (filterType === "DELETED") {
    return contacts.filter((contact) => contact.isDeleted)
  }
  return contacts
}

