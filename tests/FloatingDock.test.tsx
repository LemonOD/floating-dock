import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FloatingDock, FloatingDockSpacer, type DockItem, type DockLinkProps } from "../src/FloatingDock";

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

  it("renders a single pill, and only once something is active", () => {
    const { rerender } = render(<FloatingDock items={ITEMS} isActive={() => false} />);
    expect(bar().querySelector(".rfd-pill")).toBeNull();
    rerender(<FloatingDock items={ITEMS} isActive={(href) => href === "/home"} />);
    expect(bar().querySelectorAll(".rfd-pill")).toHaveLength(1);
    rerender(<FloatingDock items={ITEMS} isActive={(href) => href === "/search"} />);
    expect(bar().querySelectorAll(".rfd-pill")).toHaveLength(1);
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
    expect(bar().querySelectorAll(".rfd-pill")).toHaveLength(1);
    expect(moreButton.querySelector(".rfd-label--active")).not.toBeNull();
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

  describe("badges", () => {
    it("renders a count badge as part of the link's name", () => {
      render(<FloatingDock items={[{ ...ITEMS[0]!, badge: 5 }]} isActive={() => false} />);
      expect(within(bar()).getByRole("link", { name: "Home5" })).toBeInTheDocument();
    });

    it("renders a dot for `true` and nothing for 0 / false", () => {
      render(
        <FloatingDock
          items={[
            { ...ITEMS[0]!, badge: true },
            { ...ITEMS[1]!, badge: 0 },
          ]}
          isActive={() => false}
        />,
      );
      expect(bar().querySelectorAll(".rfd-badge")).toHaveLength(1);
      expect(bar().querySelector(".rfd-badge--dot")).not.toBeNull();
    });

    it("puts a plain dot on the More button when a moreItem carries a badge", () => {
      render(
        <FloatingDock
          items={ITEMS}
          moreItems={[{ ...MORE_ITEMS[0]!, badge: 3 }, MORE_ITEMS[1]!]}
          isActive={() => false}
        />,
      );
      const moreButton = within(bar()).getByRole("button", { name: "More" });
      expect(moreButton.querySelector(".rfd-badge--dot")).not.toBeNull();
      // A dot, not the count itself — the button's accessible name stays plain "More".
      expect(moreButton).toHaveAccessibleName("More");
    });

    it("does not put a dot on More when no moreItem has a badge", () => {
      render(<FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={() => false} />);
      const moreButton = within(bar()).getByRole("button", { name: "More" });
      expect(moreButton.querySelector(".rfd-badge")).toBeNull();
    });

    it("does not put a dot on More when there are no moreItems at all", () => {
      render(<FloatingDock items={ITEMS} isActive={() => false} />);
      expect(bar().querySelector(".rfd-badge")).toBeNull();
    });

    it("ignores falsy badges (0, false) on moreItems when deciding whether to show the dot", () => {
      render(
        <FloatingDock
          items={ITEMS}
          moreItems={[
            { ...MORE_ITEMS[0]!, badge: 0 },
            { ...MORE_ITEMS[1]!, badge: false },
          ]}
          isActive={() => false}
        />,
      );
      const moreButton = within(bar()).getByRole("button", { name: "More" });
      expect(moreButton.querySelector(".rfd-badge")).toBeNull();
    });

    it("still shows the dot on More even when a primary item also has its own badge", () => {
      render(
        <FloatingDock
          items={[{ ...ITEMS[0]!, badge: 2 }, ITEMS[1]!]}
          moreItems={[{ ...MORE_ITEMS[0]!, badge: true }, MORE_ITEMS[1]!]}
          isActive={() => false}
        />,
      );
      const moreButton = within(bar()).getByRole("button", { name: "More" });
      expect(moreButton.querySelector(".rfd-badge--dot")).not.toBeNull();
    });
  });

  describe("action items", () => {
    it("renders a button that calls onClick and is not a link", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <FloatingDock
          items={[ITEMS[0]!, { key: "new", label: "Create", icon: Icon, onClick, prominent: true }]}
          isActive={() => false}
        />,
      );
      const button = within(bar()).getByRole("button", { name: "Create" });
      expect(button).toHaveClass("rfd-tab--prominent");
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(within(bar()).getAllByRole("link")).toHaveLength(1);
    });

    it("runs a More-sheet action and closes the sheet", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <FloatingDock
          items={ITEMS}
          moreItems={[{ key: "out", label: "Sign out", icon: Icon, onClick }]}
          isActive={() => false}
        />,
      );
      await user.click(screen.getByRole("button", { name: "More" }));
      await user.click(screen.getByRole("button", { name: "Sign out" }));
      expect(onClick).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });
  });

  describe("theme", () => {
    it("sets data-rfd-theme only when a theme is given", () => {
      const { rerender } = render(<FloatingDock items={ITEMS} isActive={() => false} />);
      expect(bar()).not.toHaveAttribute("data-rfd-theme");
      rerender(<FloatingDock items={ITEMS} isActive={() => false} theme="frosted" />);
      expect(bar()).toHaveAttribute("data-rfd-theme", "frosted");
      rerender(<FloatingDock items={ITEMS} isActive={() => false} theme="liquid" />);
      expect(bar()).toHaveAttribute("data-rfd-theme", "liquid");
    });
  });

  describe("overflow sheet and dock", () => {
    it("keeps the dock visible and raised while the sheet is open, and toggles it from More", async () => {
      const user = userEvent.setup();
      render(<FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={() => false} />);
      await user.click(screen.getByRole("button", { name: "More" }));
      expect(bar()).toHaveClass("rfd-bar--raised");
      expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "true");
      await user.click(screen.getByRole("button", { name: "More" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(bar()).not.toHaveClass("rfd-bar--raised");
    });

    it("closes the sheet when a dock tab is used", async () => {
      const user = userEvent.setup();
      render(<FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={() => false} />);
      await user.click(screen.getByRole("button", { name: "More" }));
      await user.click(within(bar()).getByRole("link", { name: "Home" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });
  });

  describe("custom overflow content", () => {
    it("shows the default grid when no children are given", async () => {
      const user = userEvent.setup();
      render(<FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={() => false} />);
      await user.click(screen.getByRole("button", { name: "More" }));
      expect(document.querySelector(".rfd-more-grid")).not.toBeNull();
    });

    it("replaces the grid with children, still rendering extraContent below", async () => {
      const user = userEvent.setup();
      render(
        <FloatingDock items={ITEMS} moreItems={MORE_ITEMS} isActive={() => false} extraContent={<p>Extra</p>}>
          <p>My own design</p>
        </FloatingDock>,
      );
      await user.click(screen.getByRole("button", { name: "More" }));
      expect(screen.getByText("My own design")).toBeInTheDocument();
      expect(screen.getByText("Extra")).toBeInTheDocument();
      expect(document.querySelector(".rfd-more-grid")).toBeNull();
      expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
    });

    it("shows the More button for children alone, and hands them a close helper", async () => {
      const user = userEvent.setup();
      render(
        <FloatingDock items={ITEMS} isActive={() => false}>
          {({ close }) => <button onClick={close}>Done</button>}
        </FloatingDock>,
      );
      await user.click(screen.getByRole("button", { name: "More" }));
      await user.click(screen.getByRole("button", { name: "Done" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("lets you light the More button yourself, and hide the title row", async () => {
      const user = userEvent.setup();
      render(
        <FloatingDock items={ITEMS} isActive={() => false} moreActive showMoreSheetTitle={false}>
          <p>Body</p>
        </FloatingDock>,
      );
      expect(within(bar()).getByRole("button", { name: "More" }).querySelector(".rfd-label--active")).not.toBeNull();
      await user.click(screen.getByRole("button", { name: "More" }));
      expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog")).toHaveAccessibleName("Menu");
    });
  });

  describe("hideOnScroll", () => {
    const scrollTo = (y: number) => {
      Object.defineProperty(window, "scrollY", { value: y, configurable: true });
      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });
    };
    afterEach(() => scrollTo(0));

    it("hides on scroll down and returns on scroll up", () => {
      render(<FloatingDock items={ITEMS} isActive={() => false} />);
      scrollTo(200);
      expect(bar()).toHaveClass("rfd-bar--hidden");
      scrollTo(150);
      expect(bar()).not.toHaveClass("rfd-bar--hidden");
    });

    it("never hides when the option is off", () => {
      render(<FloatingDock items={ITEMS} isActive={() => false} hideOnScroll={false} />);
      scrollTo(400);
      expect(bar()).not.toHaveClass("rfd-bar--hidden");
    });
  });

  it("FloatingDockSpacer renders an aria-hidden block", () => {
    const { container } = render(<FloatingDockSpacer />);
    expect(container.firstElementChild).toHaveClass("rfd-spacer");
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
