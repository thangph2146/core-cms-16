import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Brush, Camera, ChartBarIncreasing, File, Image, UserRound } from "lucide-react"

export function AttachmentMenu() {
  return (
    <DropdownMenuContent side="top" align="start">
      <DropdownMenuItem>
        <Image className="mr-2 h-4 w-4" aria-label="Photos & Videos" /> Photos & Videos
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Camera className="mr-2 h-4 w-4" /> Camera
      </DropdownMenuItem>
      <DropdownMenuItem>
        <File className="mr-2 h-4 w-4" /> Document
      </DropdownMenuItem>
      <DropdownMenuItem>
        <UserRound className="mr-2 h-4 w-4" /> Contact
      </DropdownMenuItem>
      <DropdownMenuItem>
        <ChartBarIncreasing className="mr-2 h-4 w-4" /> Poll
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Brush className="mr-2 h-4 w-4" /> Drawing
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}