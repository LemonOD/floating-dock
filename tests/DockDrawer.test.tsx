import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DockDrawer } from "../src/DockDrawer";

function drawer(open: boolean, onClose = vi.fn(), children: React.ReactNode = <p>Drawer body</p>) {
  return (
    <DockDrawer open={open} onClose={onClose} title="Menu">
      {children}
    </DockDrawer>
  );
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("DockDrawer", () => {
  it("renders nothing while closed", () => {
    render(drawer(false));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog with the given title when open", () => {
    render(drawer(true));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "Menu" })).toBeInTheDocument();
  });

  it("renders its children", () => {
    render(drawer(true, vi.fn(), <p>Custom content</p>));
    expect(screen.getByText("Custom content")).toBeInTheDocument();
  });

  it("locks body scroll while open and restores it on close", () => {
    const { rerender } = render(drawer(true));
    expect(document.body.style.overflow).toBe("hidden");
    rerender(drawer(false));
    expect(document.body.style.overflow).toBe("");
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(drawer(true, onClose));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses a custom close label", () => {
    render(
      <DockDrawer open onClose={vi.fn()} title="Menu" closeLabel="Dismiss">
        <p>Body</p>
      </DockDrawer>,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    // The drawer portals into document.body, so its content is outside render()'s own container.
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(drawer(true, onClose));
    await user.click(document.querySelector(".rfd-overlay")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(drawer(true, onClose));
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not listen for Escape while closed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(drawer(false, onClose));
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("removes the Escape listener on unmount", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(drawer(true, onClose));
    unmount();
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("portals into document.body", () => {
    const { container } = render(drawer(true));
    expect(container).toBeEmptyDOMElement();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("re-closing and reopening works", async () => {
    const onClose = vi.fn();
    const { rerender } = render(drawer(true, onClose));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    rerender(drawer(false, onClose));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    rerender(drawer(true, onClose));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("moves focus into the dialog on open", () => {
    render(drawer(true));
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("returns focus to the opener on close", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <DockDrawer open={open} onClose={() => setOpen(false)} title="Menu">
            <p>Body</p>
          </DockDrawer>
        </>
      );
    }
    return (async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole("button", { name: "Open" }));
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
      await user.keyboard("{Escape}");
      expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
    })();
  });

  it("traps Tab and Shift+Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Outside</button>
        {drawer(true, vi.fn(), <a href="/x">Inside link</a>)}
      </>,
    );
    const close = screen.getByRole("button", { name: "Close" });
    const link = screen.getByRole("link", { name: "Inside link" });
    expect(close).toHaveFocus();
    await user.tab();
    expect(link).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(link).toHaveFocus();
  });

  it("renders a drag handle", () => {
    render(drawer(true));
    expect(document.querySelector(".rfd-handle")).not.toBeNull();
  });
});
