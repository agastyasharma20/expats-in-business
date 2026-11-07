import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MotionProvider } from "@/components/motion/motion-provider";
import { StatCounter } from "@/components/motion/stat-counter";
import { SuccessCheck } from "@/components/motion/success-check";

// jsdom has neither matchMedia nor IntersectionObserver; stub both. The observer reports
// every element as visible immediately.
function stubBrowser(reduceMotion: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduceMotion && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
}

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{}}>
      <MotionProvider>{ui}</MotionProvider>
    </NextIntlClientProvider>,
  );
}

describe("StatCounter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows the final value at once when the user prefers reduced motion", () => {
    stubBrowser(true);
    renderWithProviders(<StatCounter value={1250} suffix="+" />);
    expect(screen.getByTestId("stat-counter-value")).toHaveTextContent("1,250+");
  });

  it("always exposes the final value to assistive tech, even mid-animation", () => {
    stubBrowser(false);
    renderWithProviders(<StatCounter value={35} suffix="+" />);
    // The sr-only copy is the first child and never animates.
    expect(screen.getAllByText("35+")[0]).toHaveClass("sr-only");
  });

  describe("with motion allowed", () => {
    beforeEach(() => stubBrowser(false));

    it("counts towards the value after it scrolls into view", async () => {
      renderWithProviders(<StatCounter value={100} />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      });
      expect(screen.getByTestId("stat-counter-value")).toHaveTextContent("100");
    });
  });
});

describe("SuccessCheck", () => {
  it("announces its label", () => {
    stubBrowser(true);
    renderWithProviders(<SuccessCheck label="Task marked as done" />);
    expect(screen.getByRole("status")).toHaveTextContent("Task marked as done");
    vi.unstubAllGlobals();
  });
});
