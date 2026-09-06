"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function MotionDirector() {
  const pathname = usePathname();
  const layerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const layer = layerRef.current, cursor = cursorRef.current, progress = progressRef.current;
    if (!layer || !cursor || !progress) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let scrollFrame = 0, pointerFrame = 0, clickFrame = 0;
    let pointerX = 0, pointerY = 0;
    let scrollable = 1, scrolled = false;
    let cursorClickTimer = 0;

    const updateScroll = () => {
      if (scrollFrame || document.hidden) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        progress.style.transform = `scaleX(${Math.min(window.scrollY / scrollable, 1)})`;
        const next = window.scrollY > 40;
        if (next !== scrolled) { scrolled = next; body.classList.toggle("cs-page-scrolled", next); }
      });
    };
    const measureScroll = () => { scrollable = Math.max(root.scrollHeight - window.innerHeight, 1); updateScroll(); };
    const resizeObserver = new ResizeObserver(measureScroll);
    resizeObserver.observe(body);

    const updatePointer = (event: PointerEvent) => {
      if (!finePointer.matches || document.hidden) return;
      pointerX = event.clientX; pointerY = event.clientY;
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        cursor.style.transform = `translate3d(${pointerX - 3}px,${pointerY - 3}px,0)`;
        layer.classList.add("cs-pointer-visible");
      });
    };

    const updatePointerTarget = (event: PointerEvent) => {
      if (!finePointer.matches) return;
      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest<HTMLElement>("a, button, input, select, textarea, label, summary, [role='button'], [data-cursor-interactive]");
      layer.classList.toggle("cs-pointer-interactive", Boolean(interactive && !interactive.matches(":disabled, [aria-disabled='true']")));
    };

    const pressPointer = (event: PointerEvent) => {
      if (finePointer.matches && event.button === 0) layer.classList.add("cs-pointer-pressed");
    };

    const releasePointer = () => {
      layer.classList.remove("cs-pointer-pressed", "cs-pointer-clicked");
      window.cancelAnimationFrame(clickFrame);
      if (!finePointer.matches || reducedMotion.matches) return;
      clickFrame = window.requestAnimationFrame(() => layer.classList.add("cs-pointer-clicked"));
      window.clearTimeout(cursorClickTimer);
      cursorClickTimer = window.setTimeout(() => layer.classList.remove("cs-pointer-clicked"), 420);
    };

    const hidePointer = () => {
      window.cancelAnimationFrame(pointerFrame); pointerFrame = 0;
      layer.classList.remove("cs-pointer-visible", "cs-pointer-interactive", "cs-pointer-pressed", "cs-pointer-clicked");
    };
    const pointerCapability = () => { root.classList.toggle("cs-brand-cursor", finePointer.matches); hidePointer(); };
    const visibility = () => { if (document.hidden) { hidePointer(); window.cancelAnimationFrame(scrollFrame); scrollFrame = 0; } else measureScroll(); };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("cs-is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .1, rootMargin: "0px 0px -5%" });

    if (!pathname.startsWith("/roadmap") && !reducedMotion.matches) {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>("main > section, main article, main details"));
      // Complete layout reads before applying any reveal styles.
      const belowFold = candidates.filter(element => element.getBoundingClientRect().top >= window.innerHeight * .78);
      belowFold.forEach((element, index) => {
        element.classList.add("cs-scroll-reveal");
        element.style.setProperty("--cs-reveal-delay", `${Math.min(index % 4, 3) * 45}ms`);
        observer.observe(element);
      });
    }

    root.classList.add("cs-motion-ready");
    root.classList.toggle("cs-brand-cursor", finePointer.matches);
    finePointer.addEventListener("change", pointerCapability);
    window.addEventListener("resize", measureScroll, { passive: true });
    window.addEventListener("blur", hidePointer);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("pointermove", updatePointer, { passive: true });
    document.addEventListener("pointerover", updatePointerTarget, { passive: true });
    document.addEventListener("pointerdown", pressPointer, { passive: true });
    document.addEventListener("pointerup", releasePointer, { passive: true });
    document.addEventListener("pointercancel", releasePointer, { passive: true });
    document.addEventListener("pointerleave", hidePointer, { passive: true });
    measureScroll();

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      window.cancelAnimationFrame(pointerFrame); window.cancelAnimationFrame(scrollFrame); window.cancelAnimationFrame(clickFrame);
      finePointer.removeEventListener("change", pointerCapability);
      window.removeEventListener("resize", measureScroll);
      window.removeEventListener("blur", hidePointer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("pointermove", updatePointer);
      document.removeEventListener("pointerover", updatePointerTarget);
      document.removeEventListener("pointerdown", pressPointer);
      document.removeEventListener("pointerup", releasePointer);
      document.removeEventListener("pointercancel", releasePointer);
      document.removeEventListener("pointerleave", hidePointer);
      window.clearTimeout(cursorClickTimer);
      body.classList.remove("cs-page-scrolled");
      root.classList.remove("cs-brand-cursor", "cs-pointer-visible", "cs-pointer-interactive", "cs-pointer-pressed", "cs-pointer-clicked");
    };
  }, [pathname]);

  return <div ref={layerRef} className="site-motion-layer" aria-hidden="true"><span ref={cursorRef} className="site-brand-cursor"><img src="/cobblestar-logo.png" alt="" width={42} height={42} decoding="async" /></span><span ref={progressRef} className="site-scroll-progress" /></div>;
}
