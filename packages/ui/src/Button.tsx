import * as React from "react"
import { cn } from "./utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    const buttonContent = React.Children.map(children, (child) => {
      if (typeof child === "string" || typeof child === "number") {
        return <span>{child}</span>
      }

      return child
    })

    return (
      <button
        ref={ref}
        className={cn(
          "ui-button inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-[#070708] transition-all duration-150 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          {
            "border border-accent/70 bg-accent text-[#080808] hover:bg-[#e6c979] active:bg-[#c8a54a]": variant === "default",
            "bg-primary text-white hover:bg-primary-hover active:bg-[#b91c1c]": variant === "destructive",
            "border border-finance-200 bg-finance-50 text-finance-900 hover:border-accent/50 hover:bg-finance-100 active:border-accent/60 active:bg-finance-200": variant === "outline",
            "bg-finance-100 text-finance-900 hover:bg-finance-200 active:bg-finance-300": variant === "secondary",
            "text-finance-500 hover:bg-finance-100 hover:text-finance-900 active:bg-finance-200 active:text-finance-950": variant === "ghost",
            "text-accent underline-offset-4 hover:underline active:text-[#f0d27b]": variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      >
        {buttonContent}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
