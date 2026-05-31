// Dependency-free canvas confetti burst (emerald + gold). Browser-only and always
// fired from a click/settle handler, so it never runs during SSR. Honors
// prefers-reduced-motion and self-cleans the canvas when the burst finishes.
const COLORS = ["#34d399", "#10b981", "#ffd23f", "#fde68a", "#22d3ee"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  life: number;
}

export function fireConfetti() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const W = window.innerWidth;
  const H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "120",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const cx = W / 2;
  const cy = H * 0.4;
  const parts: Particle[] = Array.from({ length: 150 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 6 + Math.random() * 9;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 4 + Math.random() * 6,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1,
    };
  });

  const GRAVITY = 0.22;
  const DRAG = 0.992;
  let raf = 0;
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    if (canvas.parentNode) canvas.remove();
  };

  const frame = () => {
    if (done) return;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      p.vx *= DRAG;
      p.vy = p.vy * DRAG + GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.012;
      if (p.life > 0 && p.y < H + 24) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    }
    if (alive) raf = requestAnimationFrame(frame);
    else cleanup();
  };

  raf = requestAnimationFrame(frame);
  // hard safety net in case the tab is backgrounded mid-burst
  window.setTimeout(cleanup, 4000);
}
