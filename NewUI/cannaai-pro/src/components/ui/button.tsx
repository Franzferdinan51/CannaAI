import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-emerald-600 text-slate-50 shadow hover:bg-emerald-500",
        destructive:
          "bg-red-600 text-slate-50 shadow-sm hover:bg-red-500",
        outline:
          "border border-gray-600 bg-gray-800 text-gray-200 shadow-sm hover:bg-gray-700 hover:text-white",
        secondary:
          "bg-gray-700 text-gray-100 shadow-sm hover:bg-gray-600",
        ghost: "text-gray-300 hover:bg-gray-800 hover:text-white",
        link: "text-emerald-400 underline-offset-4 hover:text-emerald-300 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
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
