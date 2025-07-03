// src/components/ui/header-2.tsx

import { cn } from "@/lib/utils";

export function TypographyH2({text, className}: {text: string, className?: string}) {
  return (
    <h2 className={cn("scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0", className)}>
      {text}
    </h2>
  )
}
