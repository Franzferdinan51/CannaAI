import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-emerald-400/30 bg-emerald-400/12 text-emerald-300",
        secondary:
          "border-white/10 bg-white/[0.06] text-white/70",
        destructive:
          "border-red-400/30 bg-red-400/10 text-red-300",
        outline: "border-white/15 text-white/70",
        amber:
          "border-amber-400/30 bg-amber-400/10 text-amber-300",
        lime:
          "border-lime-400/30 bg-lime-400/10 text-lime-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
