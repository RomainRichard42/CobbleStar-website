"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function MotionDirector() {
  const pathname = usePathname();
  const layerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!/^\/(admin|wiki\/admin|actualites\/admin)(\/|$)/.test(pathname)) return;
    const root = document.documentElement;
    const body = document.body;
    const layer = layerRef.current, progress = progressRef.current;
    if (!layer || !progress) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let scrollFrame = 0;
    let scrollable = 1, scrolled = false;

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

    const visibility = () => { if (document.hidden) { window.cancelAnimationFrame(scrollFrame); scrollFrame = 0; } else measureScroll(); };

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
    window.addEventListener("resize", measureScroll, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("scroll", updateScroll, { passive: true });
    measureScroll();

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("resize", measureScroll);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("scroll", updateScroll);
      body.classList.remove("cs-page-scrolled");
      root.classList.remove("cs-brand-cursor", "cs-pointer-visible", "cs-pointer-interactive", "cs-pointer-pressed", "cs-pointer-clicked");
    };
  }, [pathname]);

  return <div ref={layerRef} className="site-motion-layer" aria-hidden="true"><span ref={progressRef} className="site-scroll-progress" /></div>;
}
