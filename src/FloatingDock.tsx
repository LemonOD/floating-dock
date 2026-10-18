"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { DockDrawer } from "./DockDrawer";
import { MoreHorizontalIcon } from "./icons";

export interface DockItemBase {
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
  const moreActive = hasMore && moreItems.some((item) => item.href !== undefined && isActive(item.href));

  return (
    <>
      <nav
        aria-label={ariaLabel}
        className={["rfd-bar", className].filter(Boolean).join(" ")}
      >
        <div className="rfd-track">
          {items.map((item) => {
            const { key, label, icon: Icon, badge } = item;
            if (item.href === undefined) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={item.onClick}
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
              <LinkComponent key={key} href={item.href} className="rfd-tab" aria-current={active ? "page" : undefined}>
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
