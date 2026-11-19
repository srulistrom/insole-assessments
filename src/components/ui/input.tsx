import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-2xl border-2 border-line bg-card px-5 text-[18px] font-medium text-ink placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, "h-14", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(base, "min-h-32 py-4", className)} {...props} />,
);
Textarea.displayName = "Textarea";

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-baseline gap-1 text-[15px] font-bold text-ink">
        {label}
        {required && <span className="text-red-600">*</span>}
        {hint && <span className="ml-1 text-sm font-medium text-muted">{hint}</span>}
      </span>
      {children}
      {error && <span className="block text-sm font-semibold text-red-600">{error}</span>}
    </label>
  );
}
