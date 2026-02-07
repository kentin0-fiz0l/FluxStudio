import * as React from "react";

import { cn } from "../../lib/utils";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Helper text to display below textarea
   */
  helperText?: string;
  /**
   * Label for the textarea
   */
  label?: string;
  /**
   * Wrapper class name
   */
  wrapperClassName?: string;
}

function Textarea({
  className,
  error,
  helperText,
  label,
  wrapperClassName,
  id,
  ...props
}: TextareaProps) {
  const generatedId = React.useId();
  const textareaId = id || generatedId;
  const descriptionId = `${textareaId}-description`;
  const hasDescription = !!(error || helperText);

  return (
    <div className={cn("w-full space-y-1.5", wrapperClassName)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          {label}
        </label>
      )}

      <textarea
        id={textareaId}
        data-slot="textarea"
        aria-describedby={hasDescription ? descriptionId : undefined}
        aria-invalid={!!error}
        className={cn(
          "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-input-solid flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...props}
      />

      {/* Helper text / Error messages */}
      {hasDescription && (
        <p
          id={descriptionId}
          role={error ? "alert" : undefined}
          aria-live={error ? "polite" : undefined}
          className={cn(
            "text-sm",
            error ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}

export { Textarea };
export type { TextareaProps };
