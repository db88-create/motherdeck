import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-[#e5e5e5] bg-white px-4 py-3 text-base text-[#404040] transition-all duration-200 ease-in-out outline-none placeholder:text-[#a3a3a3] focus-visible:border-violet-500 focus-visible:ring-3 focus-visible:ring-[rgba(139,92,246,0.1)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
