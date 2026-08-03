"use client";

import { useEffect } from "react";

/**
 * Background-scroll lock for anything that covers the page — the nav drawer,
 * every modal, the takeovers.
 *
 * Every overlay used to do this itself: save `document.body.style.overflow`,
 * set it to "hidden", put the saved value back on unmount. That is wrong the
 * moment two overlays overlap, which they do (a mini-game board opens from the
 * nav drawer; a takeover lands while a dialog is up). The second one saves
 * "hidden" as the value to restore, so whichever unmounts last writes "hidden"
 * back onto the body and the page is scroll-locked with nothing on screen — the
 * whole game frozen until a reload. A single refcount cannot get that wrong.
 *
 * It also locks the *document element*, not just the body. `body{overflow:hidden}`
 * alone does not stop a mobile browser from scrolling the page behind the
 * overlay — the scrolling box there is the viewport, not the body — which is
 * why the page underneath still slid around while a dialog was open on a phone.
 */
let depth = 0;
let release: (() => void) | null = null;

function lock() {
  if (depth++ > 0) return;

  const html = document.documentElement;
  const body = document.body;
  const prev = {
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyPad: body.style.paddingInlineEnd,
  };
  // Where the page was, so a browser that resets scrollTop when the viewport
  // stops scrolling does not silently send the player back to the top.
  const scrollY = window.scrollY;
  // Desktop only: hiding the scrollbar frees up its width, and the fixed
  // command bar would jump sideways by exactly that much without a filler.
  const gutter = window.innerWidth - html.clientWidth;

  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  if (gutter > 0) body.style.paddingInlineEnd = `${gutter}px`;

  release = () => {
    html.style.overflow = prev.htmlOverflow;
    html.style.overscrollBehavior = prev.htmlOverscroll;
    body.style.overflow = prev.bodyOverflow;
    body.style.paddingInlineEnd = prev.bodyPad;
    if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
  };
}

function unlock() {
  if (--depth > 0) return;
  depth = 0;
  release?.();
  release = null;
}

/** Locks background scroll for as long as `active` is true. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
