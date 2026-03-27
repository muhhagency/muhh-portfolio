"use client";

import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#0A1929",
  bgCard:  "#0D2137",
  bgHover: "#102A47",
  p900:    "#EEF5FA",
  p800:    "#D4E5F0",
  p700:    "#A8C5D8",
  p600:    "#6A9DBD",
  p500:    "#3A6E99",
  p400:    "#25527A",
  p300:    "#1A3A5C",
  p200:    "#102A47",
  green:   "#34c759",
};

const font = "'Inter', 'Geist', system-ui, sans-serif";

const s = {
  eyebrow: { fontSize: "11px", fontWeight: 400, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: C.p400, margin: 0 },
  tag:     { fontSize: "11px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: C.p400, margin: 0 },
};

function useBreakpoint() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h, { passive: true });
    return () => window.removeEventListener("resize", h);
  }, []);
  return { isMobile: width < 640 };
}

// ─── 1. Three.js Particle Field ───────────────────────────────────────────────
function ParticleField({ heroRef }: { heroRef: React.RefObject<HTMLElement | null> }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    // Wait a tick so heroRef.current is populated
    const timer = setTimeout(() => {
      const container = mountRef.current;
      if (!container) return;

      const isTouchDevice = "ontouchstart" in window;
      const COUNT = isMobile ? 200 : 500;
      const W = container.clientWidth || window.innerWidth;
      const H = container.clientHeight || window.innerHeight;

      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
      renderer.setPixelRatio(1);
      renderer.setSize(W, H);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
      camera.position.z = 30;

      const positions = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: 0x3a6e99,
        size: 0.18,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
      });

      const mesh = new THREE.Points(geometry, material);
      scene.add(mesh);

      let targetRotX = 0;
      let targetRotY = 0;

      const onMouseMove = (e: MouseEvent) => {
        if (isTouchDevice) return;
        targetRotX = (e.clientY / window.innerHeight - 0.5) * 0.15;
        targetRotY = (e.clientX / window.innerWidth  - 0.5) * 0.15;
      };
      window.addEventListener("mousemove", onMouseMove);

      const onResize = () => {
        const nW = container.clientWidth;
        const nH = container.clientHeight;
        camera.aspect = nW / nH;
        camera.updateProjectionMatrix();
        renderer.setSize(nW, nH);
      };
      window.addEventListener("resize", onResize);

      let isVisible = true;
      const visObs = new IntersectionObserver(
        ([entry]) => { isVisible = entry.isIntersecting; },
        { threshold: 0 }
      );
      if (heroRef.current) visObs.observe(heroRef.current);

      let frame: number;
      const animate = () => {
        frame = requestAnimationFrame(animate);
        if (!isVisible) return;
        const pos = geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < COUNT; i++) {
          pos[i * 3 + 1] += 0.003;
          if (pos[i * 3 + 1] > 15) pos[i * 3 + 1] = -15;
        }
        geometry.attributes.position.needsUpdate = true;
        mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.05;
        mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.05;
        renderer.render(scene, camera);
      };
      animate();

      // Store cleanup on the container element
      (container as any)._cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("resize", onResize);
        visObs.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      };
    }, 0);

    return () => {
      clearTimeout(timer);
      if ((mountRef.current as any)?._cleanup) (mountRef.current as any)._cleanup();
    };
  }, [isMobile]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ activeSection }: { activeSection: string }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const links = [
    { label: "Work",    id: "work"    },
    { label: "About",   id: "about"   },
    { label: "Contact", id: "contact" },
  ];

  const frosted = isScrolled || menuOpen;

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px clamp(24px, 5vw, 72px)", fontFamily: font,
        background:           frosted ? "rgba(10,25,41,0.85)" : "transparent",
        backdropFilter:       frosted ? "blur(12px)" : "none",
        WebkitBackdropFilter: frosted ? "blur(12px)" : "none",
        borderBottom:         frosted ? "0.5px solid rgba(16,42,71,0.5)" : "0.5px solid transparent",
        transition: "all 0.2s ease",
      }}>
        <button onClick={() => scrollTo("hero")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, borderRadius: "50%", overflow: "hidden", width: "48px", height: "48px", flexShrink: 0, transition: "transform 0.15s ease" }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          <img src="/profile.jpg" alt="Muhh" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "50%" }} />
        </button>
        {!isMobile && (
          <div style={{ display: "flex", gap: "32px" }}>
            {links.map(({ label, id }) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: activeSection === id ? 500 : 400, color: activeSection === id ? C.p700 : C.p600, fontFamily: font, padding: 0, transition: "color 0.2s", lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget.style.color = C.p900)}
                onMouseLeave={e => (e.currentTarget.style.color = activeSection === id ? C.p700 : C.p600)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", flexDirection: "column", gap: "5px" }} aria-label="Toggle menu">
            {[0,1,2].map(i => <span key={i} style={{ display: "block", width: "20px", height: "1.5px", background: C.p900, borderRadius: "2px", opacity: menuOpen && i === 1 ? 0 : 1, transition: "opacity 0.15s" }} />)}
          </button>
        )}
      </nav>
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", top: "56px", left: 0, right: 0, zIndex: 99, background: "rgba(10,25,41,0.97)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `0.5px solid ${C.p200}`, padding: "16px clamp(24px,5vw,72px) 24px", display: "flex", flexDirection: "column" }}>
          {links.map(({ label, id }) => (
            <button key={id} onClick={() => scrollTo(id)}
              style={{ background: "none", border: "none", borderBottom: `0.5px solid ${C.p200}`, cursor: "pointer", fontSize: "16px", fontWeight: activeSection === id ? 500 : 400, color: activeSection === id ? C.p700 : C.p600, fontFamily: font, padding: "14px 0", textAlign: "left", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = C.p900)}
              onMouseLeave={e => (e.currentTarget.style.color = activeSection === id ? C.p700 : C.p600)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ─── 2. Word-split helper ─────────────────────────────────────────────────────
function SplitWords({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", marginRight: "0.28em" }}>
          <span className="hero-word" style={{ display: "inline-block" }}>{word}</span>
        </span>
      ))}
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const { isMobile } = useBreakpoint();
  const heroRef   = useRef<HTMLElement>(null);
  const subRef    = useRef<HTMLParagraphElement>(null);
  const ctaRef    = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // 2. Hero entrance animations — plain useEffect, fires after mount
  useEffect(() => {
    const words = document.querySelectorAll(".hero-word");
    if (!words.length) return;

    const tl = gsap.timeline();
    tl.fromTo(words,           { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.0, stagger: 0.12, ease: "power2.out", delay: 0.3 })
      .fromTo(subRef.current,    { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }, 0.9)
      .fromTo(ctaRef.current,    { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }, 1.2)
      .fromTo(statusRef.current, { opacity: 0 },        { opacity: 1, duration: 0.7, ease: "power1.out" }, 1.5);
  }, []);

  return (
    <section ref={heroRef} id="hero" style={{ width: "100%", minHeight: "100vh", background: C.bg, display: "flex", justifyContent: "center", position: "relative", overflow: "hidden" }}>

      <div style={{ width: "100%", maxWidth: "1080px", padding: "clamp(100px,15vh,140px) clamp(24px,5vw,72px) 80px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
        <p style={{ ...s.eyebrow, marginBottom: "24px" }}>UX · AI Experience · Product Design</p>

        <h1 style={{ fontSize: isMobile ? "32px" : "clamp(36px,5vw,44px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.3, color: C.p900, margin: 0 }}>
          <SplitWords text="From Fortune 100 interfaces" />
          <br />
          <SplitWords text="to designing how AI thinks." />
        </h1>

        <p ref={subRef} style={{ fontSize: "15px", fontWeight: 400, lineHeight: 1.65, color: C.p600, marginTop: "20px", maxWidth: "440px", marginBottom: 0 }}>
          I design digital products where clarity is the feature and every decision has a reason. Now building at the intersection of human behavior and intelligent systems.
        </p>

        <div ref={ctaRef} style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "36px", flexWrap: "wrap" }}>
          <button onClick={() => scrollTo("work")} style={{ background: "#EEF5FA", color: "#0A1929", border: "none", borderRadius: "100px", padding: "11px 22px", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: font, letterSpacing: "-0.01em", transition: "background 0.15s, transform 0.15s", lineHeight: 1 }}
            onMouseEnter={e => { e.currentTarget.style.background = "#D4E5F0"; e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#EEF5FA"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            View Work ↗
          </button>
          <button onClick={() => scrollTo("about")} className="link-underline" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: C.p700, fontFamily: font, padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = C.p900)}
            onMouseLeave={e => (e.currentTarget.style.color = C.p700)}
          >
            About me
          </button>
        </div>

        <div ref={statusRef} style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "28px" }}>
          <span className="pulse-dot" style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.green, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: "13px", color: C.p600 }}>Available for selected projects · Middle East · Remote</span>
        </div>
      </div>
    </section>
  );
}

// ─── Case study card ──────────────────────────────────────────────────────────
interface Project { num: string; tag: string; title: string; description: string; metric: string; metricLabel: string; }

function CaseCard({ project, isLast }: { project: Project; isLast: boolean }) {
  const [hovered, setHovered] = useState(false);
  const { isMobile } = useBreakpoint();
  return (
    <div className="case-card" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? C.bgHover : C.bgCard, borderTop: `0.5px solid ${C.p200}`, borderBottom: isLast ? `0.5px solid ${C.p200}` : "none", padding: isMobile ? "24px 0" : "28px 24px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 100px", gap: isMobile ? "12px" : "32px", alignItems: "start", cursor: "default", transition: "background 150ms ease", fontFamily: font, marginLeft: isMobile ? 0 : "-24px", marginRight: isMobile ? 0 : "-24px", borderRadius: "4px" }}
    >
      <div>
        <p style={{ ...s.tag, marginBottom: "10px" }}>{project.num} — {project.tag}</p>
        <p style={{ fontSize: "17px", fontWeight: 500, letterSpacing: "-0.02em", color: C.p800, margin: "0 0 10px" }}>{project.title}</p>
        <p style={{ fontSize: "13px", fontWeight: 400, lineHeight: 1.6, color: C.p600, margin: 0 }}>{project.description}</p>
      </div>
      {!isMobile && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", height: "100%", paddingTop: "2px" }}>
          <div style={{ textAlign: "right" }}>
            {project.metric ? (<><p style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em", color: C.p800, margin: 0, lineHeight: 1.1 }}>{project.metric}</p><p style={{ ...s.tag, marginTop: "4px" }}>{project.metricLabel}</p></>) : <p style={{ ...s.tag, color: C.p400 }}>TBA</p>}
          </div>
          <span style={{ fontSize: "16px", color: C.p500, marginTop: "auto", paddingTop: "24px" }}>↗</span>
        </div>
      )}
      {isMobile && <span style={{ fontSize: "14px", color: C.p500 }}>↗ View project</span>}
    </div>
  );
}

// ─── Work ─────────────────────────────────────────────────────────────────────
const projects: Project[] = [
  { num: "01", tag: "B2B SaaS · Healthcare · 2024",                        title: "Redesigning Medical Records Retrieval for Legal & Insurance Professionals",       description: "Ground-up redesign of the requestor portal used by law firms and insurance companies to request, track, and retrieve HIPAA-compliant medical records from a national provider network.", metric: "", metricLabel: "" },
  { num: "02", tag: "Enterprise · Internal Tooling · Fortune 100 · 2024",  title: "Modernizing an Enterprise Inventory System for a Fortune 100 Food Manufacturer", description: "Complete redesign of Tyson Foods' internal inventory platform — transforming a legacy system into a modern web app used by warehouse managers, plant operators, and supply chain teams across national facilities.", metric: "", metricLabel: "" },
  { num: "03", tag: "Mobile · FinTech · AI · MENA · 2024",                 title: "A Smart Spending Companion for the TapCeit Digital Receipt Ecosystem",            description: "The consumer-facing app of a digital receipt platform — turning paper receipts into structured financial data, helping users track spending, set budgets, and build better financial habits through AI-assisted insights.", metric: "", metricLabel: "" },
  { num: "04", tag: "Mobile · Social Gifting · Consumer · Saudi Arabia · 2024", title: "Designing a Cultural Gifting Experience Around Saudi Coffee Tradition",       description: "A digital coffee gifting platform for Saudi Arabia — letting users buy virtual coffee beans, send them with personal messages, and redeem at partner cafés. The challenge: make a digital transaction feel like a genuine cultural gesture.", metric: "", metricLabel: "" },
  { num: "05", tag: "Coming Soon",                                           title: "To be added",                                                                      description: "Details coming soon. Some projects are under NDA.", metric: "", metricLabel: "" },
];

function Work() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef   = useRef<HTMLDivElement>(null);
  const labelRef   = useRef<HTMLParagraphElement>(null);
  const footerRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !cardsRef.current) return;
    const cards = cardsRef.current.querySelectorAll(".case-card");

    // 10. Label fade
    if (labelRef.current) {
      gsap.fromTo(labelRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power1.out", scrollTrigger: { trigger: labelRef.current, start: "top 85%", toggleActions: "play none none none", once: true } });
    }
    // 3. Cards stagger reveal
    gsap.fromTo(cards, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.15, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 75%", toggleActions: "play none none none", once: true } });
    // Footer
    if (footerRef.current) {
      gsap.fromTo(footerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power1.out", scrollTrigger: { trigger: footerRef.current, start: "top 90%", toggleActions: "play none none none", once: true } });
    }
  }, []);

  return (
    <section ref={sectionRef} id="work" style={{ width: "100%", background: C.bg, borderTop: `0.5px solid ${C.p200}`, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "1080px", padding: "96px clamp(24px,5vw,72px)", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <p ref={labelRef} style={{ ...s.eyebrow, marginBottom: "40px" }}>Selected Work</p>
        <div ref={cardsRef} style={{ width: "100%", display: "flex", flexDirection: "column" }}>
          {projects.map((p, i) => <CaseCard key={p.num} project={p} isLast={i === projects.length - 1} />)}
        </div>
        <div ref={footerRef} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "20px", marginTop: "8px", flexWrap: "wrap", gap: "8px" }}>
          <p style={{ fontSize: "12px", color: C.p500, margin: 0 }}>Some projects are under NDA. Details available on request.</p>
          <a href="#" className="link-underline" style={{ fontSize: "13px", color: C.p600, fontFamily: font, fontWeight: 500, textDecoration: "none" }}>All projects →</a>
        </div>
      </div>
    </section>
  );
}

// ─── About ────────────────────────────────────────────────────────────────────
const facts = [
  { label: "Based in",       value: "Middle East · Available globally" },
  { label: "Specialization", value: "AI Experience Design · UX/UI · Product" },
  { label: "Experience",     value: "8+ years" },
  { label: "Clients",        value: "Fortune 100 · Top-tier US companies · MENA startups" },
  { label: "Currently",      value: "Building expertise at the UX / AI intersection" },
  { label: "Languages",      value: "English · Arabic" },
];

function About() {
  const { isMobile }  = useBreakpoint();
  const sectionRef    = useRef<HTMLElement>(null);
  const labelRef      = useRef<HTMLParagraphElement>(null);
  const bioRef        = useRef<HTMLDivElement>(null);
  const factsRef      = useRef<HTMLDivElement>(null);
  const manifestoRef  = useRef<HTMLDivElement>(null);

  const bioLines = [
    { text: "I design products that earn trust.",                                                                                                                      weight: 600, muted: false },
    { text: "Not through polish — through clarity, honesty, and decisions that hold up under scrutiny.",                                                               weight: 400, muted: true  },
    { text: "I've spent 8+ years working with Fortune 100 companies and early-stage startups across healthcare, finance, food manufacturing, and consumer tech.",      weight: 400, muted: true  },
    { text: "Now I'm building at the frontier of AI Experience Design — where the hardest problems aren't visual, they're behavioral.",                                weight: 400, muted: true  },
    { text: "The designer's job is shifting: from laying out interfaces to shaping how intelligent systems behave.",                                                    weight: 400, muted: true  },
  ];

  useEffect(() => {
    if (!sectionRef.current) return;

    // 10. Label
    if (labelRef.current) {
      gsap.fromTo(labelRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power1.out", scrollTrigger: { trigger: labelRef.current, start: "top 85%", toggleActions: "play none none none", once: true } });
    }
    // 9. Bio lines
    if (bioRef.current) {
      gsap.fromTo(Array.from(bioRef.current.children), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.18, ease: "power2.out", scrollTrigger: { trigger: bioRef.current, start: "top 75%", toggleActions: "play none none none", once: true } });
    }
    // 9. Facts
    if (factsRef.current) {
      gsap.fromTo(Array.from(factsRef.current.children), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: factsRef.current, start: "top 80%", toggleActions: "play none none none", once: true } });
    }
    // 9. Manifesto
    if (manifestoRef.current) {
      gsap.fromTo(manifestoRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out", scrollTrigger: { trigger: manifestoRef.current, start: "top 85%", toggleActions: "play none none none", once: true } });
    }
  }, []);

  return (
    <section ref={sectionRef} id="about" style={{ width: "100%", background: C.bgCard, borderTop: `0.5px solid ${C.p200}`, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "1080px", padding: "96px clamp(24px,5vw,72px)", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <p ref={labelRef} style={{ ...s.eyebrow, marginBottom: "32px" }}>About</p>

        <div ref={bioRef} style={{ maxWidth: "680px", marginBottom: "48px", width: "100%" }}>
          {bioLines.map((line, i) => (
            <p key={i} style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: line.weight, letterSpacing: "-0.02em", color: line.muted ? C.p600 : C.p900, lineHeight: 1.5, margin: "0 0 12px" }}>
              {line.text}
            </p>
          ))}
        </div>

        <div style={{ width: "100%", height: "0.5px", background: C.p200, marginBottom: "40px" }} />

        <div ref={factsRef} style={{ width: "100%", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", marginBottom: "48px" }}>
          {facts.map((fact, i) => (
            <div key={i} style={{ borderTop: `0.5px solid ${C.p200}`, padding: "16px 24px 16px 0" }}>
              <p style={{ ...s.tag, marginBottom: "6px" }}>{fact.label}</p>
              <p style={{ fontSize: "14px", color: C.p700, fontWeight: 400, margin: 0, lineHeight: 1.5 }}>{fact.value}</p>
            </div>
          ))}
        </div>

        <div ref={manifestoRef} style={{ maxWidth: "620px", width: "100%", paddingTop: "8px" }}>
          <p style={{ fontSize: isMobile ? "18px" : "21px", fontStyle: "italic", fontWeight: 400, color: C.p800, lineHeight: 1.65, letterSpacing: "-0.015em", margin: "0 0 16px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
            "Most designers ask: how should this look? I ask: what does this need to do, and what's the least amount of design required to do it?"
          </p>
          <p style={{ fontSize: "13px", color: C.p500, margin: 0, letterSpacing: "0.02em" }}>Restraint is the hardest skill to develop. It's also the one that separates senior from junior work.</p>
        </div>
      </div>
    </section>
  );
}

// ─── Contact ──────────────────────────────────────────────────────────────────
function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef   = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (labelRef.current) {
      gsap.fromTo(labelRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power1.out", scrollTrigger: { trigger: labelRef.current, start: "top 85%", toggleActions: "play none none none", once: true } });
    }
  }, []);

  const socialLinks = [
    { label: "LinkedIn",               href: "#" },
    { label: "X (@muhhtweets)",        href: "#" },
    { label: "Instagram (@muhhshots)", href: "#" },
  ];

  return (
    <section ref={sectionRef} id="contact" style={{ width: "100%", background: C.bg, borderTop: `0.5px solid ${C.p200}`, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "1080px", padding: "96px clamp(24px,5vw,72px)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <p ref={labelRef} style={{ ...s.eyebrow, marginBottom: "16px" }}>Get in touch</p>
        <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.025em", color: C.p800, margin: "0 0 16px" }}>Let's work together.</h2>
        <p style={{ fontSize: "15px", color: C.p600, lineHeight: 1.65, maxWidth: "380px", margin: "0 0 36px" }}>
          I take on select projects where design can make a real difference. If you're building something that matters, I'd like to hear about it.
        </p>
        <a href="mailto:hello@muhh.design" style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#EEF5FA", color: "#0A1929", borderRadius: "100px", padding: "11px 24px", fontSize: "14px", fontWeight: 600, textDecoration: "none", fontFamily: font, letterSpacing: "-0.01em", marginBottom: "36px", transition: "background 0.15s", lineHeight: 1 }}
          onMouseEnter={e => (e.currentTarget.style.background = "#D4E5F0")}
          onMouseLeave={e => (e.currentTarget.style.background = "#EEF5FA")}
        >
          Send an email ↗
        </a>
        <div style={{ display: "flex", gap: "28px", flexWrap: "wrap", justifyContent: "center", marginBottom: "28px" }}>
          {socialLinks.map(({ label, href }) => (
            <a key={label} href={href} className="link-underline" style={{ fontSize: "13px", color: C.p500, textDecoration: "none", fontFamily: font, transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = C.p700)}
              onMouseLeave={e => (e.currentTarget.style.color = C.p500)}
            >
              {label}
            </a>
          ))}
        </div>
        <p style={{ fontSize: "12px", color: C.p400, margin: 0 }}>Usually responds within 24 hours.</p>
      </div>
    </section>
  );
}

// ─── Active section hook ──────────────────────────────────────────────────────
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { rootMargin: "-40% 0px -55% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [ids]);
  return active;
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Portfolio() {
  const activeSection = useActiveSection(["hero", "work", "about", "contact"]);

  return (
    <div style={{ fontFamily: font, background: C.bg, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        p { margin: 0; }

        /* 6. Availability dot pulse with ripple ring */
        @keyframes pulse_dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.2); opacity: 0.85; }
        }
        @keyframes pulse_ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .pulse-dot { position: relative; animation: pulse_dot 2s ease-in-out infinite; transform-origin: center; }
        .pulse-dot::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: #34c759; animation: pulse_ring 2s ease-out infinite; }

        /* 8. Sliding underline */
        .link-underline { position: relative; text-decoration: none !important; }
        .link-underline::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 0; height: 1px; background: currentColor; transition: width 0.2s ease; }
        .link-underline:hover::after { width: 100%; }
      `}</style>

      <Nav activeSection={activeSection} />

      {/* 7. Framer Motion page entrance */}
      <motion.main
        style={{ width: "100%" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <Hero />
        <Work />
        <About />
        <Contact />
      </motion.main>

      <footer style={{ width: "100%", background: C.bgCard, borderTop: `0.5px solid ${C.p200}`, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "1080px", padding: "24px clamp(24px,5vw,72px)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <p style={{ fontSize: "12px", color: C.p400, margin: 0 }}>© 2026 Muhh</p>
          <p style={{ fontSize: "12px", color: C.p400, margin: 0 }}>UX · AI Experience · Product Design</p>
        </div>
      </footer>
    </div>
  );
}
