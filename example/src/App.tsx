import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Home,
  KeyRound,
  LogOut,
  Moon,
  User,
  Wallet,
} from "lucide-react";
import { FloatingDock, type DockItem, type DockLinkProps } from "react-floating-dock";

const PRIMARY: DockItem[] = [
  { key: "home", href: "/home", label: "Home", icon: Home },
  { key: "deposit", href: "/deposit", label: "Deposit", icon: Wallet },
  { key: "withdraw", href: "/withdraw", label: "Withdraw", icon: ArrowDownToLine },
  { key: "history", href: "/history", label: "History", icon: ArrowLeftRight },
];

const MORE: DockItem[] = [
  { key: "profile", href: "/profile", label: "Profile", icon: User, badge: 2 },
  { key: "password", href: "/password", label: "Password", icon: KeyRound },
];

// Simulates a router: a real app would pass next/link's <Link>, react-router's <Link>, etc.
function FakeLink({ href, children, className, onClick, ...rest }: DockLinkProps & { onNavigate?: (href: string) => void }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
        window.dispatchEvent(new CustomEvent("fake-navigate", { detail: href }));
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function App() {
  const [path, setPath] = useState("/home");

  useState(() => {
    window.addEventListener("fake-navigate", (e) => setPath((e as CustomEvent).detail));
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "1.5rem 1.25rem 7rem", maxWidth: 420, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>react-floating-dock</h1>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          Current page: <strong style={{ color: "#3b82f6" }}>{path}</strong>
        </p>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.5 }}>
          Tap a tab below, or open &quot;More&quot; for the overflow sheet. This mimics a router by
          swapping a bit of local state — a real app passes its own Link component instead of{" "}
          <code>FakeLink</code>.
        </p>
      </header>

      <FloatingDock
        items={PRIMARY}
        moreItems={MORE}
        isActive={(href) => href === path}
        LinkComponent={FakeLink}
        extraContent={
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "1rem" }}>
            <button className="rfd-more-item" type="button">
              <span className="rfd-more-icon-circle">
                <Moon className="rfd-more-icon" />
              </span>
              <span className="rfd-more-label">Theme</span>
            </button>
            <button className="rfd-more-item" type="button">
              <span className="rfd-more-icon-circle">
                <LogOut className="rfd-more-icon" />
              </span>
              <span className="rfd-more-label">Log out</span>
            </button>
          </div>
        }
      />
    </div>
  );
}
