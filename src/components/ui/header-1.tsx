// src/components/ui/header-1.tsx

import { cn } from "@/lib/utils";

export function TypographyH1({text, className}: {text: string, className?: string}) {
  return (
    <h1 className={cn("scroll-m-20 text-3xl font-semibold", className)}>
      {text}
    </h1>
  )
}
