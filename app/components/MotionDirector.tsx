"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function MotionDirector() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let ticking = false;
    let cursorClickTimer = 0;

    const updateScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        root.style.setProperty("--cs-scroll-progress", String(Math.min(window.scrollY / scrollable, 1)));
        body.classList.toggle("cs-page-scrolled", window.scrollY > 40);
        ticking = false;
      });
    };

    const updatePointer = (event: PointerEvent) => {
      root.style.setProperty("--cs-pointer-x", `${event.clientX}px`);
      root.style.setProperty("--cs-pointer-y", `${event.clientY}px`);
      if (finePointer.matches) root.classList.add("cs-pointer-visible");
    };

    const updatePointerTarget = (event: PointerEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const interactive = target?.closest<HTMLElement>("a, button, input, select, textarea, label, summary, [role='button'], [data-cursor-interactive]");
      root.classList.toggle("cs-pointer-interactive", Boolean(interactive && !interactive.matches(":disabled, [aria-disabled='true']")));
    };

    const pressPointer = (event: PointerEvent) => {
      if (event.button === 0) root.classList.add("cs-pointer-pressed");
    };

    const releasePointer = () => {
      root.classList.remove("cs-pointer-pressed");
      root.classList.remove("cs-pointer-clicked");
      window.requestAnimationFrame(() => root.classList.add("cs-pointer-clicked"));
      window.clearTimeout(cursorClickTimer);
      cursorClickTimer = window.setTimeout(() => root.classList.remove("cs-pointer-clicked"), 420);
    };

    const hidePointer = () => {
      root.classList.remove("cs-pointer-visible", "cs-pointer-interactive", "cs-pointer-pressed");
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("cs-is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .1, rootMargin: "0px 0px -5%" });

    if (!pathname.startsWith("/roadmap")) {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>("main > section, main article, main details"));
      candidates.forEach((element, index) => {
        if (element.getBoundingClientRect().top < window.innerHeight * .78) return;
        element.classList.add("cs-scroll-reveal");
        element.style.setProperty("--cs-reveal-delay", `${Math.min(index % 4, 3) * 45}ms`);
        observer.observe(element);
      });
    }

    root.classList.add("cs-motion-ready");
    root.classList.toggle("cs-brand-cursor", finePointer.matches);
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("pointermove", updatePointer, { passive: true });
    document.addEventListener("pointerover", updatePointerTarget, { passive: true });
    document.addEventListener("pointerdown", pressPointer, { passive: true });
    document.addEventListener("pointerup", releasePointer, { passive: true });
    document.addEventListener("pointercancel", releasePointer, { passive: true });
    document.addEventListener("pointerleave", hidePointer, { passive: true });
    updateScroll();

    return () => {
      observer.disconnect();
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

  return <div className="site-motion-layer" aria-hidden="true"><i className="site-pointer-glow" /><span className="site-brand-cursor"><img src="/cobblestar-logo.png" alt="" /></span><span className="site-scroll-progress" /></div>;
}
