"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { CloseIcon } from "./icons";

export interface DockDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** aria-label for the close button. @default "Close" */
  closeLabel?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Drag further than this many px, or flick faster than this many px/s, to dismiss the sheet. */
const DISMISS_OFFSET = 100;
const DISMISS_VELOCITY = 500;

/**
 * A bottom sheet on narrow viewports, a centered modal from `sm` up. Used by {@link FloatingDock}
 * for its overflow menu, but works standalone for any mobile-style sheet.
 */
export function DockDrawer({ open, onClose, title, children, closeLabel = "Close" }: DockDrawerProps) {
  // Portals need a DOM node, which doesn't exist during SSR — render nothing until mounted client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dialogRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Move focus into the dialog on open and hand it back to whatever opened it on close.
  useEffect(() => {
    if (!open || !mounted) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus();
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") return onClose();
      if (event.key !== "Tab") return;
      // Keep Tab cycling inside the dialog.
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return event.preventDefault();
      const current = document.activeElement;
      if (!dialogRef.current?.contains(current)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="rfd-overlay-wrap">
          <motion.div
            className="rfd-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="rfd-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) onClose();
            }}
          >
            {/* Only the handle and header start a drag, so the scrolling body keeps working. */}
            <div className="rfd-sheet-grab" onPointerDown={(event) => dragControls.start(event)}>
              <span className="rfd-handle" aria-hidden="true" />
            </div>
            <div className="rfd-sheet-header" onPointerDown={(event) => dragControls.start(event)}>
              <h2 className="rfd-sheet-title">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label={closeLabel}
                className="rfd-close-btn"
              >
                <CloseIcon className="rfd-close-icon" />
              </button>
            </div>
            <div className="rfd-sheet-body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
