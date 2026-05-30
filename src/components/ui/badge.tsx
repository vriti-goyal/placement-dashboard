import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge font-mono inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-[#F7931A]/20 text-[#F7931A] border-[#F7931A]/30 [a]:hover:bg-[#F7931A]/30",
        secondary:
          "bg-[#EA580C]/20 text-[#EA580C] border-[#EA580C]/30 [a]:hover:bg-[#EA580C]/30",
        destructive:
          "bg-destructive/20 text-destructive border-destructive/30 focus-visible:ring-destructive/40 [a]:hover:bg-destructive/30",
        outline:
          "border-white/20 text-white [a]:hover:bg-white/10",
        live:
          "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/30 shadow-[0_0_15px_rgba(255,214,0,0.2)] before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-[#FFD600] before:rounded-full before:animate-ping before:mr-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
