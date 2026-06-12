import * as React from "react"
import { cn } from "./utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-finance-200 bg-finance-100 px-3 py-2 text-sm text-finance-900 shadow-none transition-colors duration-200 file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-black placeholder:text-finance-400 hover:border-accent/45 focus:border-accent focus:outline-none focus-visible:border-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-finance-50 disabled:opacity-70",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
