"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { DockDrawer } from "./DockDrawer";
import { MoreHorizontalIcon } from "./icons";

export interface DockItem {
  /** Unique React key. Usually the same as `href`. */
  key: string;
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * A count (`5`), short text (`"99+"`), or `true` for a plain dot. Falsy values and `0` render nothing.
   * Numbers and text are part of the item's accessible name.
   */
  badge?: number | string | boolean;
}

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
  /** Extra destinations shown in the overflow sheet when the "More" button is pressed. */
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
}

const DefaultLink: ComponentType<DockLinkProps> = ({ href, children, ...rest }) => (
  <a href={href} {...rest}>
    {children}
  </a>
);

function Badge({ value }: { value: number | string | boolean | undefined }) {
  if (!value) return null;
  if (value === true) return <span className="rfd-badge rfd-badge--dot" aria-hidden="true" />;
  return <span className="rfd-badge">{value}</span>;
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
}: FloatingDockProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const hasMore = moreItems.length > 0;
  const moreActive = hasMore && moreItems.some((item) => isActive(item.href));

  return (
    <>
      <nav
        aria-label={ariaLabel}
        className={["rfd-bar", className].filter(Boolean).join(" ")}
      >
        <div className="rfd-track">
          {items.map(({ key, href, label, icon: Icon, badge }) => {
            const active = isActive(href);
            return (
              <LinkComponent key={key} href={href} className="rfd-tab" aria-current={active ? "page" : undefined}>
                {active && (
                  <motion.span
                    layoutId="rfd-pill"
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    className="rfd-pill"
                  />
                )}
                <Icon className={active ? "rfd-icon rfd-icon--active" : "rfd-icon"} />
                <span className={active ? "rfd-label rfd-label--active" : "rfd-label"}>{label}</span>
                <Badge value={badge} />
              </LinkComponent>
            );
          })}

          {hasMore && (
            <button type="button" onClick={() => setMoreOpen(true)} aria-label={moreLabel} className="rfd-tab rfd-more-btn">
              {moreActive && <span className="rfd-pill" />}
              <MoreHorizontalIcon className={moreActive ? "rfd-icon rfd-icon--active" : "rfd-icon"} />
              <span className={moreActive ? "rfd-label rfd-label--active" : "rfd-label"}>{moreLabel}</span>
            </button>
          )}
        </div>
      </nav>

      {hasMore && (
        <DockDrawer open={moreOpen} onClose={() => setMoreOpen(false)} title={moreSheetTitle} closeLabel={closeLabel}>
          <div className="rfd-more-grid">
            {moreItems.map(({ key, href, label, icon: Icon, badge }) => {
              const active = isActive(href);
              return (
                <LinkComponent key={key} href={href} className="rfd-more-item" onClick={() => setMoreOpen(false)}>
                  <span className={active ? "rfd-more-icon-circle rfd-more-icon-circle--active" : "rfd-more-icon-circle"}>
                    <Icon className="rfd-more-icon" />
                    <Badge value={badge} />
                  </span>
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
