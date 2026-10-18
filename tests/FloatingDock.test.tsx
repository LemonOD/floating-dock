import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FloatingDock, type DockItem, type DockLinkProps } from "../src/FloatingDock";

// jsdom cannot navigate; swallow clicks on real anchors so they don't log "not implemented" noise.
const swallowLinkNavigation = (e: MouseEvent) => {
  if ((e.target as Element).closest("a")) e.preventDefault();
};
beforeEach(() => document.addEventListener("click", swallowLinkNavigation));
afterEach(() => document.removeEventListener("click", swallowLinkNavigation));

function Icon(props: { className?: string }) {
  return <svg data-testid="icon" className={props.className} />;
}

const ITEMS: DockItem[] = [
  { key: "home", href: "/home", label: "Home", icon: Icon },
  { key: "search", href: "/search", label: "Search", icon: Icon },
];

const MORE_ITEMS: DockItem[] = [
  { key: "profile", href: "/profile", label: "Profile", icon: Icon },
  { key: "settings", href: "/settings", label: "Settings", icon: Icon },
];

const bar = () => screen.getByRole("navigation", { name: "Main" });

describe("FloatingDock", () => {
  it("renders every primary item as a link with its label and href", () => {
    render(<FloatingDock items={ITEMS} isActive={() => false} />);
    const links = within(bar()).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Home", "/home"],
      ["Search", "/search"],
    ]);
  });

  it("marks the active item with aria-current, and only that one", () => {
    render(<FloatingDock items={ITEMS} isActive={(href) => href === "/search"} />);
    expect(within(bar()).getByRole("link", { name: "Search" })).toHaveAttribute("aria-current", "page");
    expect(within(bar()).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("renders the sliding pill only behind the active item", () => {
    render(<FloatingDock items={ITEMS} isActive={(href) => href === "/home"} />);
    const home = within(bar()).getByRole("link", { name: "Home" });
    const search = within(bar()).getByRole("link", { name: "Search" });
    expect(home.querySelector(".rfd-pill")).not.toBeNull();
    expect(search.querySelector(".rfd-pill")).toBeNull();
  });

  it("renders no More button when moreItems is omitted", () => {
    render(<FloatingDock items={ITEMS} isActive={() => false} />);
    expect(within(bar()).queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a More button after the primary items when moreItems is given", () => {
    render(<FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={() => false} />);
    expect(within(bar()).getByRole("button", { name: "More" })).toBeInTheDocument();
  });

  it("uses a custom label for the More button", () => {
    render(<FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={() => false} moreLabel="Plus" />);
    expect(within(bar()).getByRole("button", { name: "Plus" })).toBeInTheDocument();
  });

  it("does not list moreItems directly in the bar", () => {
    render(<FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={() => false} />);
    expect(within(bar()).queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  });

  it("highlights More (and no primary tab) when a secondary item is active", () => {
    render(<FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={(href) => href === "/profile"} />);
    const moreButton = within(bar()).getByRole("button", { name: "More" });
    expect(moreButton.querySelector(".rfd-pill")).not.toBeNull();
    expect(within(bar()).getAllByRole("link").every((l) => !l.hasAttribute("aria-current"))).toBe(true);
  });

  it("opens the overflow sheet with its items when More is clicked", async () => {
    const user = userEvent.setup();
    render(<FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={() => false} moreSheetTitle="Everything else" />);
    await user.click(within(bar()).getByRole("button", { name: "More" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Everything else" })).toBeInTheDocument();
    const links = within(dialog).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Profile", "/profile"],
      ["Settings", "/settings"],
    ]);
  });

  it("closes the overflow sheet after a link inside it is clicked", async () => {
    const user = userEvent.setup();
    render(<FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={() => false} />);
    await user.click(within(bar()).getByRole("button", { name: "More" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("link", { name: "Profile" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("renders extraContent inside the overflow sheet", async () => {
    const user = userEvent.setup();
    render(
      <FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={() => false} extraContent={<button>Sign out</button>} />,
    );
    await user.click(within(bar()).getByRole("button", { name: "More" }));
    expect(await screen.findByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("uses a plain anchor by default", () => {
    render(<FloatingDock items={ITEMS} isActive={() => false} />);
    expect(within(bar()).getByRole("link", { name: "Home" }).tagName).toBe("A");
  });

  it("uses a custom LinkComponent when provided, e.g. a router's Link", () => {
    const CustomLink = ({ href, children, ...rest }: DockLinkProps) => (
      <a href={href} data-router-link="true" {...rest}>
        {children}
      </a>
    );
    render(<FloatingDock items={ITEMS} isActive={() => false} LinkComponent={CustomLink} />);
    expect(within(bar()).getByRole("link", { name: "Home" })).toHaveAttribute("data-router-link", "true");
  });

  it("applies a custom className to the bar alongside the default one", () => {
    render(<FloatingDock items={ITEMS} isActive={() => false} className="my-custom-class" />);
    expect(bar()).toHaveClass("rfd-bar");
    expect(bar()).toHaveClass("my-custom-class");
  });

  it("uses a custom aria-label for the bar", () => {
    render(<FloatingDock items={ITEMS} isActive={() => false} ariaLabel="Primary navigation" />);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
  });
});
