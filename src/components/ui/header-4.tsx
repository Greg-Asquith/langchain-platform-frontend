// src/components/ui/header-4.tsx

import { cn } from "@/lib/utils";

export function TypographyH4({text, className}: {text: string, className?: string}) {
  return (
    <h4 className={cn("scroll-m-20 text-xl font-semibold tracking-tight", className)}>
      {text}
    </h4>
  )
}