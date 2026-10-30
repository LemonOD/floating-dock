"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { motion, useAnimationControls, useReducedMotion, type Transition } from "framer-motion";
import { DockDrawer, type DockTheme } from "./DockDrawer";
import { MoreHorizontalIcon } from "./icons";

interface DockItemBase {
  /** Unique React key. Usually the same as `href`. */
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * A count (`5`), short text (`"99+"`), or `true` for a plain dot. Falsy values and `0` render nothing.
   * Numbers and text are part of the item's accessible name.
   */
  badge?: number | string | boolean;
}

/** A navigable destination, rendered through `LinkComponent`. */
export interface DockLinkItem extends DockItemBase {
  href: string;
  onClick?: never;
  prominent?: never;
}

/** A button that runs an action instead of navigating — e.g. a centre "Create" button. */
export interface DockActionItem extends DockItemBase {
  onClick: () => void;
  href?: never;
  /** Render as a raised, accent-filled button (like the centre button on Instagram or TikTok). */
  prominent?: boolean;
}

export type DockItem = DockLinkItem | DockActionItem;

export interface DockLinkProps {
  href: string;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
  "aria-current"?: "page";
}

export interface FloatingDockProps {
  /** Destinations shown directly in the bar. Four or five is the sweet spot. */
  items: DockItem[];
  /**
   * Extra destinations shown in the overflow sheet when the "More" button is pressed. If any of
   * them carries a `badge`, the "More" button itself gets a plain attention dot — so something
   * needing attention is never hidden from view just because it's tucked in the overflow.
   */
  moreItems?: DockItem[];
  /** Tells the dock which item (if any) is the current page. */
  isActive: (href: string) => boolean;
  /**
   * The component used to render each navigable item — swap in your router's Link
   * (e.g. `next/link`, `react-router`'s `Link`) for client-side navigation.
   * @default a plain anchor tag
   */
  LinkComponent?: ComponentType<DockLinkProps>;
  /** @default "More" */
  moreLabel?: string;
  /** @default "Menu" */
  moreSheetTitle?: string;
  /** Passed through to the overflow sheet's close button. @default "Close" */
  closeLabel?: string;
  /** Rendered at the bottom of the overflow sheet — a natural slot for a theme toggle, sign-out, etc. */
  extraContent?: ReactNode;
  /** @default "Main" */
  ariaLabel?: string;
  className?: string;
  /** Colour preset. Redefine the `--rfd-*` variables for anything custom. @default "dark" */
  theme?: DockTheme;
  /** Slide the dock out of view while scrolling down and bring it back on scroll up. @default false */
  hideOnScroll?: boolean;
}

const DefaultLink: ComponentType<DockLinkProps> = ({ href, children, ...rest }) => (
  <a href={href} {...rest}>
    {children}
  </a>
);

const SCROLL_HIDE_AFTER = 80;
const SCROLL_DELTA = 8;

function useHiddenOnScroll(enabled: boolean) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      return;
    }
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (Math.abs(delta) < SCROLL_DELTA) return;
      setHidden(delta > 0 && y > SCROLL_HIDE_AFTER);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);
  return hidden;
}

// useLayoutEffect warns during SSR; the pill is client-only anyway, so fall back to useEffect there.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const MORE_KEY = "__rfd-more__";

/** Unhurried, with a little overshoot, so the eye can follow the pill from one tab to the next. */
const PILL_MOVE = { type: "spring", stiffness: 120, damping: 17, mass: 1 } as const;
/** While travelling the pill swells taller than the bar's tabs and settles back, like WhatsApp's. */
const PILL_STRETCH = { scaleY: [1, 1.28, 1], scaleX: [1, 1.04, 1] };
const PILL_STRETCH_TRANSITION: Transition = { duration: 0.7, times: [0, 0.4, 1], ease: "easeInOut" };

interface PillRect {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Re-measured because the layout changed (resize), not because the active tab did — don't animate. */
  instant: boolean;
}

function Badge({ value }: { value: number | string | boolean | undefined }) {
  if (!value) return null;
  if (value === true) return <span className="rfd-badge rfd-badge--dot" aria-hidden="true" />;
  return <span className="rfd-badge">{value}</span>;
}

/**
 * Empty block as tall as the dock, so fixed-position dock never covers the end of your page.
 * Place it as the last child of your scrolling content.
 */
export function FloatingDockSpacer({ className }: { className?: string }) {
  return <div aria-hidden="true" className={["rfd-spacer", className].filter(Boolean).join(" ")} />;
}

/**
 * A floating, fully-rounded bottom navigation bar in the style of WhatsApp's mobile tab bar: an
 * animated pill highlights the active tab, and a "More" button opens the rest of your destinations
 * in a bottom sheet. Framework-agnostic — bring your own router via `LinkComponent`.
 */
export function FloatingDock({
  items,
  moreItems = [],
  isActive,
  LinkComponent = DefaultLink,
  moreLabel = "More",
  moreSheetTitle = "Menu",
  closeLabel = "Close",
  extraContent,
  ariaLabel = "Main",
  className,
  theme,
  hideOnScroll = false,
}: FloatingDockProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const hasMore = moreItems.length > 0;
  const moreActive = hasMore && moreItems.some((item) => item.href !== undefined && isActive(item.href));
  // A plain dot, not a count: the point is "something in here needs attention", not how much.
  const moreHasBadge = hasMore && moreItems.some((item) => !!item.badge);
  const hidden = useHiddenOnScroll(hideOnScroll);
  const [focusWithin, setFocusWithin] = useState(false);

  // One pill for the whole bar, measured against the active tab's content and animated between tabs.
  const activeKey = items.find((item) => item.href !== undefined && isActive(item.href))?.key ?? (moreActive ? MORE_KEY : null);
  const trackRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef(new Map<string, HTMLElement>());
  const [pill, setPill] = useState<PillRect | null>(null);
  const stretch = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const registerContent = useCallback((key: string, el: HTMLElement | null) => {
    if (el) contentRefs.current.set(key, el);
    else contentRefs.current.delete(key);
  }, []);

  const measure = useCallback(
    (instant: boolean) => {
      const track = trackRef.current;
      const content = activeKey === null ? undefined : contentRefs.current.get(activeKey);
      if (!track || !content) return;
      const t = track.getBoundingClientRect();
      const c = content.getBoundingClientRect();
      const next = {
        x: c.left - t.left - track.clientLeft,
        y: c.top - t.top - track.clientTop,
        width: c.width,
        height: c.height,
        instant,
      };
      setPill((prev) =>
        prev && prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height
          ? prev
          : next,
      );
    },
    [activeKey],
  );

  useIsomorphicLayoutEffect(() => measure(false), [measure, items, moreLabel, hasMore]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure(true));
    observer.observe(track);
    contentRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [measure, items.length, hasMore]);

  const previousKey = useRef(activeKey);
  useEffect(() => {
    const from = previousKey.current;
    previousKey.current = activeKey;
    if (from !== null && activeKey !== null && from !== activeKey && !reducedMotion) {
      void stretch.start({ ...PILL_STRETCH, transition: PILL_STRETCH_TRANSITION });
    }
  }, [activeKey, reducedMotion, stretch]);

  return (
    <>
      <nav
        aria-label={ariaLabel}
        className={["rfd-bar", hidden && !focusWithin && !moreOpen && "rfd-bar--hidden", moreOpen && "rfd-bar--raised", className].filter(Boolean).join(" ")}
        data-rfd-theme={theme}
        onFocus={() => setFocusWithin(true)}
        onBlur={() => setFocusWithin(false)}
      >
        <div className="rfd-track" ref={trackRef}>
          {pill && (
            <motion.span
              aria-hidden="true"
              className="rfd-pill-slot"
              initial={false}
              animate={{ x: pill.x, width: pill.width, opacity: activeKey === null ? 0 : 1 }}
              transition={
                pill.instant || reducedMotion
                  ? { duration: 0 }
                  : { x: PILL_MOVE, width: PILL_MOVE, opacity: { duration: 0.2 } }
              }
              style={{ top: pill.y, height: pill.height }}
            >
              <motion.span className="rfd-pill" animate={stretch} />
            </motion.span>
          )}
          {items.map((item) => {
            const { key, label, icon: Icon, badge } = item;
            if (item.href === undefined) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    item.onClick();
                  }}
                  className={item.prominent ? "rfd-tab rfd-tab--prominent" : "rfd-tab"}
                >
                  {item.prominent ? (
                    <span className="rfd-prominent">
                      <Icon className="rfd-prominent-icon" />
                    </span>
                  ) : (
                    <Icon className="rfd-icon" />
                  )}
                  <span className={item.prominent ? "rfd-label rfd-label--prominent" : "rfd-label"}>{label}</span>
                  <Badge value={badge} />
                </button>
              );
            }
            const active = isActive(item.href);
            return (
              <LinkComponent
                key={key}
                href={item.href}
                className="rfd-tab"
                aria-current={active ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
              >
                <span className="rfd-tab-inner" ref={(el) => registerContent(key, el)}>
                  <Icon className={active ? "rfd-icon rfd-icon--active" : "rfd-icon"} />
                  <span className={active ? "rfd-label rfd-label--active" : "rfd-label"}>{label}</span>
                </span>
                <Badge value={badge} />
              </LinkComponent>
            );
          })}

          {hasMore && (
            <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-label={moreLabel} className="rfd-tab rfd-more-btn">
              <span className="rfd-tab-inner" ref={(el) => registerContent(MORE_KEY, el)}>
                <MoreHorizontalIcon className={moreActive ? "rfd-icon rfd-icon--active" : "rfd-icon"} />
                <span className={moreActive ? "rfd-label rfd-label--active" : "rfd-label"}>{moreLabel}</span>
              </span>
              <Badge value={moreHasBadge} />
            </button>
          )}
        </div>
      </nav>

      {hasMore && (
        <DockDrawer open={moreOpen} onClose={() => setMoreOpen(false)} title={moreSheetTitle} closeLabel={closeLabel} theme={theme}>
          <div className="rfd-more-grid">
            {moreItems.map((item) => {
              const { key, label, icon: Icon, badge } = item;
              const active = item.href !== undefined && isActive(item.href);
              const circle = (
                <span className={active ? "rfd-more-icon-circle rfd-more-icon-circle--active" : "rfd-more-icon-circle"}>
                  <Icon className="rfd-more-icon" />
                  <Badge value={badge} />
                </span>
              );
              if (item.href === undefined) {
                return (
                  <button
                    key={key}
                    type="button"
                    className="rfd-more-item"
                    onClick={() => {
                      setMoreOpen(false);
                      item.onClick();
                    }}
                  >
                    {circle}
                    <span className="rfd-more-label">{label}</span>
                  </button>
                );
              }
              return (
                <LinkComponent key={key} href={item.href} className="rfd-more-item" onClick={() => setMoreOpen(false)}>
                  {circle}
                  <span className="rfd-more-label">{label}</span>
                </LinkComponent>
              );
            })}
          </div>
          {extraContent}
        </DockDrawer>
      )}
    </>
  );
}
