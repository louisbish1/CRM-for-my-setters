import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white shadow-sm outline-none transition placeholder:text-white/35 focus:border-white/20 focus:bg-white/[0.05]",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
