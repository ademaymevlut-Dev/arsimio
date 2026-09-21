import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative rounded-lg border p-4 text-sm [&>svg]:mb-2 [&>svg]:size-5",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        success: "border-success-border bg-success text-success-foreground",
        warning: "border-warning-border bg-warning text-warning-foreground",
        info: "border-info-border bg-info text-info-foreground",
        danger: "border-danger-border bg-danger text-danger-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({
  className,
  variant,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-title"
      className={cn("font-semibold leading-5", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("mt-1 text-sm leading-6", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
