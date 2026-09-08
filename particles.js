(() => {
    "use strict";

    const header = document.querySelector(".header");
    const canvas = document.querySelector(".hero-particles");
    if (!header || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const pointer = { x: 0, y: 0, active: false };
    let width = 0;
    let height = 0;
    let inView = true;
    let frame = null;
    let lastTime = 0;
    let elapsed = 0;
    let waveRipples = [];
    const waveBrush = { x: 0, y: 0, strength: 0 };
    const focus = { x: 0, y: 0 };

    // Reuse a soft sprite instead of creating a gradient for every particle/frame.
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const glow = sprite.getContext("2d");
    if (!glow) return;
    const gradient = glow.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(235, 253, 255, 1)");
    gradient.addColorStop(0.16, "rgba(168, 238, 255, 0.95)");
    gradient.addColorStop(0.4, "rgba(71, 193, 255, 0.3)");
    gradient.addColorStop(1, "rgba(71, 193, 255, 0)");
    glow.fillStyle = gradient;
    glow.fillRect(0, 0, 32, 32);

    function light(x, y, size, alpha) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    }

    function resize() {
        const bounds = header.getBoundingClientRect();
        width = bounds.width;
        height = bounds.height;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        focus.x = width * 0.73;
        focus.y = height * 0.5;
        resetWaveInteraction();
        pointer.active = false;
        draw(0);
    }

    function draw(dt) {
        ctx.clearRect(0, 0, width, height);
        if (!width || !height) return;
        elapsed += dt;
        const targetX = pointer.active ? pointer.x : width * 0.73;
        const easing = 1 - Math.exp(-dt * 3);
        focus.x += (targetX - focus.x) * easing;
        drawWaves(dt);
    }

    function resetWaveInteraction() {
        waveRipples = [];
        waveBrush.strength = 0;
    }

    function disturbWaves(x, y, strength) {
        waveRipples.push({ x, y, born: elapsed, strength });
        if (waveRipples.length > 8) waveRipples.shift();
    }

    function attraction(dx, dy, influence) {
        const pull = Math.min(0.84, influence * 0.82);
        return { x: -dx * pull, lift: dy * pull + influence * 10 };
    }

    function drawWaves(dt) {
        const columns = width < 650 ? 36 : 76;
        const rows = width < 650 ? 20 : 28;
        const sway = (focus.x / width - 0.73) * 48;
        const active = pointer.active && !reducedMotion.matches;
        const brushEase = 1 - Math.exp(-dt * 12);
        if (active) {
            // Start at the entry point rather than sweeping in from a corner.
            if (waveBrush.strength < 0.01) {
                waveBrush.x = pointer.x;
                waveBrush.y = pointer.y;
            }
            waveBrush.x += (pointer.x - waveBrush.x) * brushEase;
            waveBrush.y += (pointer.y - waveBrush.y) * brushEase;
        }
        waveBrush.strength += ((active ? 1 : 0) - waveBrush.strength) * brushEase;
        waveRipples = waveRipples.filter(ripple => elapsed - ripple.born < 1.8);
        const impulses = waveRipples.map(ripple => ({
            ...ripple,
            age: elapsed - ripple.born
        }));
        const brushRadius = width < 650 ? 95 : 145;
        ctx.globalCompositeOperation = "lighter";
        for (let row = 0; row < rows; row++) {
            const depth = row / (rows - 1);
            const perspective = 0.35 + depth * 0.85;
            for (let col = 0; col < columns; col++) {
                const u = col / (columns - 1);
                const crest = Math.sin(u * 11 + depth * 8 - elapsed * 1.15)
                    + Math.cos(u * 6 - depth * 5 + elapsed * 0.65) * 0.55;
                const x = width / 2 + (u - 0.5) * width * 1.5 * perspective + sway * depth;
                const y = height * (0.55 + Math.pow(depth, 1.5) * 0.43)
                    + crest * (10 + depth * 25);
                const dx = x - waveBrush.x;
                const dy = y - waveBrush.y;
                const distance = Math.hypot(dx, dy * 1.35);
                const influence = Math.exp(-distance * distance / (brushRadius * brushRadius))
                    * waveBrush.strength;
                const hover = attraction(dx, dy, influence);
                let offsetX = hover.x;
                let lift = hover.lift;
                let energy = influence * 0.55;
                for (const ripple of impulses) {
                    const rx = x - ripple.x;
                    const ry = (y - ripple.y) / 0.62;
                    const radialDistance = Math.hypot(rx, ry);
                    const duration = 1.8;
                    const pulse = Math.sin(Math.PI * ripple.age / duration);
                    const spread = brushRadius * 1.25;
                    const envelope = Math.exp(-radialDistance * radialDistance / (spread * spread))
                        * pulse * ripple.strength;
                    const force = attraction(rx, y - ripple.y, envelope);
                    offsetX += force.x;
                    lift += force.lift;
                    energy += envelope * 0.6;
                }
                const edge = Math.min(1, u * 7, (1 - u) * 7);
                // Bound overlapping clicks so the original wave surface remains legible.
                lift = Math.max(-90, Math.min(100, lift));
                offsetX = Math.max(-110, Math.min(110, offsetX));
                light(x + offsetX, y - lift,
                    3 + depth * 7 + Math.min(energy, 1) * 3,
                    Math.min(1, 0.28 + depth * 0.6 + energy * 0.35) * edge);
            }
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
    }

    function animate(time) {
        frame = null;
        // Cap long frame gaps so resuming a tab never jumps the particles.
        const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
        lastTime = time;
        draw(dt);
        frame = window.requestAnimationFrame(animate);
    }

    function syncAnimation() {
        if (frame !== null) window.cancelAnimationFrame(frame);
        frame = null;
        lastTime = 0;
        draw(0);
        if (inView && !document.hidden && !reducedMotion.matches) {
            frame = window.requestAnimationFrame(animate);
        }
    }

    header.addEventListener("pointermove", (event) => {
        if (!finePointer.matches || event.pointerType === "touch" || reducedMotion.matches) return;
        if (event.target.closest("button, a")) { pointer.active = false; return; }
        const bounds = header.getBoundingClientRect();
        pointer.x = event.clientX - bounds.left;
        pointer.y = event.clientY - bounds.top;
        pointer.active = true;
    }, { passive: true });
    header.addEventListener("pointerdown", (event) => {
        if (reducedMotion.matches || event.button !== 0
            || event.target.closest("button, a")) return;
        const bounds = header.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        disturbWaves(x, y, 1.15);
    }, { passive: true });
    header.addEventListener("pointerleave", () => { pointer.active = false; });
    header.addEventListener("pointercancel", () => { pointer.active = false; });
    window.addEventListener("blur", () => { pointer.active = false; });
    window.addEventListener("scroll", () => { pointer.active = false; }, { passive: true });
    document.addEventListener("visibilitychange", syncAnimation);
    reducedMotion.addEventListener("change", () => {
        pointer.active = false;
        resetWaveInteraction();
        syncAnimation();
    });

    if ("IntersectionObserver" in window) {
        new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            syncAnimation();
        }).observe(header);
    }
    if ("ResizeObserver" in window) {
        new ResizeObserver(resize).observe(header);
    } else {
        window.addEventListener("resize", resize, { passive: true });
    }
    resize();
    syncAnimation();
})();
