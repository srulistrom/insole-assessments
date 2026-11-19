"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;

/** Bottom sheet on phones, centred card on tablets. */
export function DialogContent({
  className,
  children,
  title,
  description,
}: {
  className?: string;
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "animate-rise safe-bottom fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[32px] bg-card p-6 shadow-lift focus:outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[32px]",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line sm:hidden" />
        <DialogPrimitive.Close className="absolute right-4 top-4 grid size-11 place-items-center rounded-full text-muted hover:bg-line/60" aria-label="Close">
          <X className="size-6" />
        </DialogPrimitive.Close>
        <DialogPrimitive.Title className="pr-12 text-2xl font-extrabold tracking-tight">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-2 text-base font-medium text-muted">{description}</DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        )}
        <div className="mt-5">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
