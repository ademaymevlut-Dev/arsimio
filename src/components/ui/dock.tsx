"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  type MotionValue,
  type SpringOptions,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DockItemData = {
  id: string;
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
};

type DockItemProps = DockItemData & {
  mouseX: MotionValue<number>;
  distance: number;
  baseItemSize: number;
  magnification: number;
  spring: SpringOptions;
};

export type DockProps = {
  items: DockItemData[];
  label: string;
  className?: string;
  distance?: number;
  baseItemSize?: number;
  magnification?: number;
  spring?: SpringOptions;
};

const defaultSpring: SpringOptions = {
  mass: 0.12,
  stiffness: 180,
  damping: 16,
};

function DockItem({
  href,
  icon,
  label,
  active = false,
  badge,
  mouseX,
  distance,
  baseItemSize,
  magnification,
  spring,
}: DockItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [showLabel, setShowLabel] = useState(false);
  const mouseDistance = useTransform(mouseX, (pointerX) => {
    const rect = itemRef.current?.getBoundingClientRect();

    if (!rect) return Number.POSITIVE_INFINITY;

    return pointerX - (rect.left + rect.width / 2);
  });
  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize],
  );
  const size = useSpring(targetSize, spring);

  function handleFocus() {
    setShowLabel(true);

    const rect = itemRef.current?.getBoundingClientRect();
    if (rect) mouseX.set(rect.left + rect.width / 2);
  }

  function handleBlur() {
    setShowLabel(false);
    mouseX.set(Number.POSITIVE_INFINITY);
  }

  return (
    <motion.div
      ref={itemRef}
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <AnimatePresence>
        {showLabel ? (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.14 }}
            className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background"
          >
            {label}
          </motion.span>
        ) : null}
      </AnimatePresence>

      <Link
        href={href}
        scroll={false}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        onMouseEnter={() => setShowLabel(true)}
        onMouseLeave={() => setShowLabel(false)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "relative flex size-full items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:size-[46%]",
          active
            ? "bg-card text-primary"
            : "bg-primary-foreground/10 text-primary-foreground/75 hover:bg-primary-foreground/20 hover:text-primary-foreground",
        )}
      >
        {icon}
        {typeof badge === "number" ? (
          <span
            aria-hidden
            className={cn(
              "absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-4",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-primary-foreground text-primary",
            )}
          >
            {badge}
          </span>
        ) : null}
      </Link>
    </motion.div>
  );
}

export function Dock({
  items,
  label,
  className,
  distance = 100,
  baseItemSize = 40,
  magnification = 56,
  spring = defaultSpring,
}: DockProps) {
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY);
  const reduceMotion = useReducedMotion();
  const effectiveMagnification = reduceMotion ? baseItemSize : magnification;

  return (
    <div
      className={cn(
        "relative flex min-h-[72px] min-w-0 items-end justify-center px-2",
        className,
      )}
    >
      <nav
        aria-label={label}
        onMouseMove={(event) => mouseX.set(event.clientX)}
        onMouseLeave={() => mouseX.set(Number.POSITIVE_INFINITY)}
        className="flex max-w-full items-end gap-1.5 rounded-2xl bg-primary p-2"
      >
        {items.map((item) => (
          <DockItem
            key={item.id}
            {...item}
            mouseX={mouseX}
            distance={distance}
            baseItemSize={baseItemSize}
            magnification={effectiveMagnification}
            spring={spring}
          />
        ))}
      </nav>
    </div>
  );
}
