import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "btn-primary-glow text-[#04120c]",
        destructive:
          "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-[0_10px_30px_-10px_rgba(248,113,113,0.7)] hover:brightness-110 hover:-translate-y-0.5",
        outline:
          "border border-white/12 bg-white/[0.04] text-white/80 backdrop-blur-md hover:bg-white/[0.08] hover:border-emerald-400/30 hover:text-white",
        secondary:
          "bg-white/[0.07] text-white/85 border border-white/[0.06] hover:bg-white/[0.11] hover:-translate-y-0.5",
        ghost: "text-white/60 hover:bg-white/[0.06] hover:text-white",
        link: "text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={type}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
