import { Grid3X3, List } from "lucide-react"

import { cn } from '@genispace/geniapp/utils'

import { ToggleGroup, ToggleGroupItem } from "./toggle-group"

export type ViewMode = "grid" | "list"

export interface ViewModeToggleProps {
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
  className?: string
  gridAriaLabel?: string
  listAriaLabel?: string
}

export function ViewModeToggle({
  mode,
  onModeChange,
  className,
  gridAriaLabel = "Grid view",
  listAriaLabel = "List view",
}: ViewModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(v) => {
        if (v === "grid" || v === "list") onModeChange(v)
      }}
      className={cn("view-toggle", className)}
    >
      <ToggleGroupItem value="grid" aria-label={gridAriaLabel}>
        <Grid3X3 className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label={listAriaLabel}>
        <List className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
