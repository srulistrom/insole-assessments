import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl text-[17px] font-bold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 select-none [&_svg]:size-6 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:brightness-110",
        gold: "bg-gold text-gold-foreground shadow-soft hover:brightness-105",
        whatsapp: "bg-whatsapp text-white shadow-soft hover:brightness-105",
        outline: "border-2 border-primary/25 bg-card text-primary hover:bg-primary/5",
        soft: "bg-primary/8 text-primary hover:bg-primary/12",
        ghost: "text-primary hover:bg-primary/8",
        destructive: "bg-red-600 text-white shadow-soft hover:brightness-110",
        "destructive-outline": "border-2 border-red-200 bg-card text-red-700 hover:bg-red-50",
      },
      size: {
        default: "h-14 px-6",
        lg: "h-16 px-8 text-lg",
        sm: "h-11 rounded-xl px-4 text-[15px]",
        icon: "size-14",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" />}
          {children}
        </>
      )}
    </Comp>
  );
}
