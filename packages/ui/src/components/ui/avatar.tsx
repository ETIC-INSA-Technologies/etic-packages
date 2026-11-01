"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cn } from "cn"

/** Taille des initiales d'un avatar de diamètre libre, en part du diamètre. */
const PART_INITIALES = 0.36

function Avatar({
  className,
  size = "default",
  diametre,
  style,
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "default" | "sm" | "lg"
  /** Écart ETIC : diamètre libre, en px (photo d'une fiche…), au-delà des
   *  tailles de shadcn (24, 32, 40 px). Remplace `size` ; les initiales
   *  suivent (36 % du diamètre). */
  diametre?: number
}) {
  // Une seule condition pour tout ce qui dépend du diamètre (0 : ignoré).
  const libre = diametre !== undefined && diametre > 0 ? diametre : undefined
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      // Sans `data-size`, les règles liées à `size` (initiales en `text-xs`,
      // taille du badge) ne s'appliquent pas à un diamètre libre.
      data-size={libre ? undefined : size}
      data-diametre={libre}
      style={
        libre
          ? (etat) => ({
              width: libre,
              height: libre,
              fontSize: Math.round(libre * PART_INITIALES),
              ...(typeof style === "function" ? style(etat) : style),
            })
          : style
      }
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        // Écart ETIC : avec un diamètre libre, les initiales prennent la
        // taille posée sur la racine (proportionnelle au diamètre).
        "group-data-diametre/avatar:text-[length:inherit]",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
