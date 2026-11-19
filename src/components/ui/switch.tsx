"use client";
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-9 w-16 shrink-0 rounded-full bg-slate-300 transition-colors data-[state=checked]:bg-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-7 translate-x-1 rounded-full bg-white shadow-md transition-transform data-[state=checked]:translate-x-8" />
    </SwitchPrimitive.Root>
  );
}
