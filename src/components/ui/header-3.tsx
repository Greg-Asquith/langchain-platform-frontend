// src/components/ui/header-3.tsx

import { cn } from "@/lib/utils";

export function TypographyH3({text, className}: {text: string, className?: string}) {
  return (
    <h3 className={cn("scroll-m-20 text-2xl font-semibold tracking-tight", className)}>
      {text}
    </h3>
  )
}