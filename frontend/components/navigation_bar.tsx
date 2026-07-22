"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { House, Images, UserRound } from "lucide-react";
import { usePalate } from "@/providers/palate_provider";
import { logUiPerf, startRouteTransition, uiPerfNow } from "@/utils/ui_perf";
import { WalletPanel } from "./wallet_panel";

const nav_items = [
  { label: "Home", href: "/", icon: House },
  { label: "My Media", href: "/my-media", icon: Images },
  { label: "Profile", href: "/profile", icon: UserRound }
];

const BRAND_LOGO_SOURCE_SIZE = 96;
const NAV_WHEEL_THRESHOLD = 48;
const NAV_WHEEL_COOLDOWN_MS = 220;
const NAV_MOTION_MS = 220;
const NAV_DRAG_THRESHOLD_PX = 6;
const NAV_DRAG_STEP = 56;
const NAV_DRAG_LIMIT = 128;
const VISIBLE_NAV_SLOTS = ["top", "middle", "bottom"] as const;

type NavMotionDirection = "idle" | "previous" | "next";

function wrapNavIndex(index: number) {
  return ((index % nav_items.length) + nav_items.length) % nav_items.length;
}

function getActiveNavIndex(pathname: string) {
  return nav_items.findIndex((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)));
}

function getShapeClass(sequenceIndex: number) {
  return Math.abs(sequenceIndex % 2) === 0 ? "nav_shape_a" : "nav_shape_b";
}

export function NavigationBar() {
  const pathname = usePathname();
  const activeIndex = Math.max(getActiveNavIndex(pathname), 0);
  const [logoAvailable, setLogoAvailable] = useState(true);
  const [carouselPosition, setCarouselPosition] = useState(0);
  const [motionDirection, setMotionDirection] = useState<NavMotionDirection>("idle");
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const navLinksRef = useRef<HTMLDivElement | null>(null);
  const wheelAccumulatorRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const dragStartYRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const draggingRef = useRef(false);
  const possibleDragRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const { claimReadStatus, claimableRewardsSummary } = usePalate();

  const visibleNavItems = useMemo(
    () =>
      VISIBLE_NAV_SLOTS.map((slot, slotIndex) => {
        const sequenceIndex = carouselPosition + slotIndex;
        const itemIndex = wrapNavIndex(sequenceIndex);
        return {
          item: nav_items[itemIndex],
          itemIndex,
          sequenceIndex,
          shapeClass: getShapeClass(sequenceIndex),
          slot
        };
      }),
    [carouselPosition]
  );

  const clearMotionTimer = useCallback(() => {
    if (motionTimerRef.current) {
      clearTimeout(motionTimerRef.current);
      motionTimerRef.current = null;
    }
  }, []);

  const rotateCarouselBy = useCallback(
    (steps: number) => {
      if (steps === 0) {
        return;
      }

      clearMotionTimer();
      setMotionDirection(steps > 0 ? "next" : "previous");
      setCarouselPosition((current) => current + steps);
      motionTimerRef.current = setTimeout(() => {
        setMotionDirection("idle");
        motionTimerRef.current = null;
      }, NAV_MOTION_MS);
    },
    [clearMotionTimer]
  );

  const handleWheelDelta = useCallback(
    (deltaX: number, deltaY: number, preventDefault: () => void) => {
      if (Math.abs(deltaY) <= Math.abs(deltaX) || Math.abs(deltaY) < 4) {
        return;
      }

      preventDefault();

      if (wheelLockedRef.current) {
        return;
      }

      wheelAccumulatorRef.current += deltaY;

      if (Math.abs(wheelAccumulatorRef.current) < NAV_WHEEL_THRESHOLD) {
        return;
      }

      const steps = wheelAccumulatorRef.current > 0 ? 1 : -1;
      wheelAccumulatorRef.current = 0;
      wheelLockedRef.current = true;
      rotateCarouselBy(steps);

      if (wheelTimerRef.current) {
        clearTimeout(wheelTimerRef.current);
      }

      wheelTimerRef.current = setTimeout(() => {
        wheelLockedRef.current = false;
        wheelTimerRef.current = null;
      }, NAV_WHEEL_COOLDOWN_MS);
    },
    [rotateCarouselBy]
  );

  useEffect(() => {
    const node = navLinksRef.current;

    if (!node) {
      return undefined;
    }

    const handleNativeWheel = (event: WheelEvent) => {
      handleWheelDelta(event.deltaX, event.deltaY, () => event.preventDefault());
    };

    node.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      node.removeEventListener("wheel", handleNativeWheel);
    };
  }, [handleWheelDelta]);

  useEffect(
    () => () => {
      clearMotionTimer();

      if (wheelTimerRef.current) {
        clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = null;
      }
    },
    [clearMotionTimer]
  );

  const handleNavKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      rotateCarouselBy(1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      rotateCarouselBy(-1);
    }
  };

  const handleNavClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressNextClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressNextClickRef.current = false;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    possibleDragRef.current = true;
    draggingRef.current = false;
    dragStartYRef.current = event.clientY;
    dragOffsetRef.current = 0;
    setDragging(false);
    setDragOffset(0);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!possibleDragRef.current || activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const pointerDelta = event.clientY - dragStartYRef.current;

    if (!draggingRef.current && Math.abs(pointerDelta) <= NAV_DRAG_THRESHOLD_PX) {
      return;
    }

    if (!draggingRef.current) {
      draggingRef.current = true;
      setDragging(true);
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    event.preventDefault();

    const nextOffset = Math.max(-NAV_DRAG_LIMIT, Math.min(NAV_DRAG_LIMIT, pointerDelta));
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  };

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!possibleDragRef.current || activePointerIdRef.current !== event.pointerId) {
      return;
    }

    possibleDragRef.current = false;
    activePointerIdRef.current = null;

    if (!draggingRef.current) {
      dragOffsetRef.current = 0;
      setDragOffset(0);
      return;
    }

    const finalOffset = dragOffsetRef.current;
    const steps = Math.round(-finalOffset / NAV_DRAG_STEP);
    setDragging(false);
    draggingRef.current = false;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    suppressNextClickRef.current = true;
    setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 0);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    rotateCarouselBy(steps);
  };

  const cancelPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    possibleDragRef.current = false;
    activePointerIdRef.current = null;
    draggingRef.current = false;
    dragOffsetRef.current = 0;
    setDragging(false);
    setDragOffset(0);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const recordNavigation = (label: string, href: string) => {
    const startedAt = uiPerfNow();
    logUiPerf("mainNavClick", {
      label,
      href,
      routerAction: "link",
      localStateUpdatedImmediately: true
    });
    startRouteTransition("desktop-nav", href, "link");
    logUiPerf("mainNavClick:end", {
      label,
      syncDurationMs: Math.round(uiPerfNow() - startedAt)
    });
  };

  return (
    <nav className="navigation_bar desktop_only" aria-label="Main navigation">
      <Link className="brand_lockup" href="/">
        <svg aria-hidden="true" className="brand_wordmark" viewBox="0 0 160 42" preserveAspectRatio="xMidYMid meet">
          <defs>
            <path d="M 10 33 C 36 8, 124 8, 150 33" id="palate-brand-arc" />
          </defs>
          <text className="brand_wordmark_text">
            <textPath href="#palate-brand-arc" startOffset="50%" textAnchor="middle">
              PALATE
            </textPath>
          </text>
        </svg>
        {logoAvailable ? (
          <span className="brand_mark">
            <Image alt="Palate logo" height={BRAND_LOGO_SOURCE_SIZE} onError={() => setLogoAvailable(false)} priority src="/brand/palate_logo.png" width={BRAND_LOGO_SOURCE_SIZE} />
          </span>
        ) : null}
      </Link>
      <div
        className="nav_links"
        data-dragging={dragging ? "true" : "false"}
        data-motion={motionDirection}
        onClickCapture={handleNavClickCapture}
        onKeyDown={handleNavKeyDown}
        onPointerCancel={cancelPointerDrag}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        ref={navLinksRef}
      >
        <div className="nav_wheel_stack" style={{ "--nav-carousel-offset": `${dragOffset}px` } as CSSProperties}>
          {visibleNavItems.map(({ item, itemIndex, sequenceIndex, shapeClass, slot }) => {
            const active = itemIndex === activeIndex;
            const showClaimReminder = item.href === "/profile" && claimableRewardsSummary.hasClaimableRewards;
            const claimReminderKnown = claimReadStatus !== "loading" || claimableRewardsSummary.hasClaimableRewards;
            const Icon = item.icon;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`nav_link nav_destination ${shapeClass} ${active ? "active" : ""} ${showClaimReminder ? "nav_link_attention" : ""}`}
                data-sequence={sequenceIndex}
                data-slot={slot}
                href={item.href}
                key={`${sequenceIndex}-${item.href}`}
                onClick={() => {
                  recordNavigation(item.label, item.href);
                }}
                onDragStart={(event) => event.preventDefault()}
              >
                <span className="nav_link_main">
                  <Icon aria-hidden="true" className="nav_route_icon" strokeWidth={2.25} />
                  <span className="nav_link_label">{item.label}</span>
                </span>
                {showClaimReminder && claimReminderKnown ? <span aria-hidden="true" className="nav_claim_indicator" /> : null}
              </Link>
            );
          })}
        </div>
      </div>
      <WalletPanel />
    </nav>
  );
}
