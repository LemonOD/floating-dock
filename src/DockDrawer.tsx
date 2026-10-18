"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon } from "./icons";

export interface DockDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** aria-label for the close button. @default "Close" */
  closeLabel?: string;
}

/**
 * A bottom sheet on narrow viewports, a centered modal from `sm` up. Used by {@link FloatingDock}
 * for its overflow menu, but works standalone for any mobile-style sheet.
 */
export function DockDrawer({ open, onClose, title, children, closeLabel = "Close" }: DockDrawerProps) {
  // Portals need a DOM node, which doesn't exist during SSR — render nothing until mounted client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      if (event.key === "Escape") onClose();
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
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="rfd-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            <div className="rfd-sheet-header">
              <h2 className="rfd-sheet-title">{title}</h2>
              <button type="button" onClick={onClose} aria-label={closeLabel} className="rfd-close-btn">
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
