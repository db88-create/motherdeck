"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-base font-semibold whitespace-nowrap transition-all duration-200 ease-in-out outline-none select-none focus-visible:ring-3 focus-visible:ring-[rgba(139,92,246,0.1)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-violet-600 hover:shadow-[0_4px_12px_rgba(139,92,246,0.15)]",
        outline:
          "border-[#e5e5e5] bg-white text-[#404040] hover:bg-[#fafafa] hover:border-[#d4d4d4]",
        secondary:
          "bg-[#f5f5f5] text-[#404040] hover:bg-[#e5e5e5]",
        ghost:
          "text-[#525252] hover:bg-[#f5f5f5] hover:text-[#404040]",
        destructive:
          "bg-red-50 text-[#ef4444] hover:bg-red-100 focus-visible:ring-red-100",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-6 py-3",
        xs: "h-7 gap-1 rounded-md px-3 py-1.5 text-xs font-medium [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-4 py-2 text-sm font-medium [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-6 py-3",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
