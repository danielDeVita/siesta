export function OrnateFrame({ children }: { children: React.ReactNode }) {
  // Bead chain along inner border line (y=23.5)
  const bspc = 8;
  const br = { x: 23.5, y: 23.5, w: 253, h: 253 };
  const beads: { cx: number; cy: number }[] = [];
  for (let x = br.x; x <= br.x + br.w; x += bspc) beads.push({ cx: x, cy: br.y });
  for (let y = br.y + bspc; y <= br.y + br.h; y += bspc) beads.push({ cx: br.x + br.w, cy: y });
  for (let x = br.x + br.w - bspc; x >= br.x; x -= bspc) beads.push({ cx: x, cy: br.y + br.h });
  for (let y = br.y + br.h - bspc; y > br.y; y -= bspc) beads.push({ cx: br.x, cy: y });

  const corners = [
    { x: 12, y: 12, r: 0 },
    { x: 288, y: 12, r: 90 },
    { x: 288, y: 288, r: 180 },
    { x: 12, y: 288, r: 270 },
  ];

  // Mid-edge: ornament faces inward (+y in local space = toward image center)
  const mids = [
    { x: 150, y: 12, r: 0 },
    { x: 288, y: 150, r: 90 },
    { x: 150, y: 288, r: 180 },
    { x: 12, y: 150, r: 270 },
  ];

  // Micro-dots along outer band edge (chasing effect)
  const outerDots: { cx: number; cy: number }[] = [];
  const odSpc = 12;
  const od = { x: 4, y: 4, w: 292, h: 292 };
  for (let x = od.x + 6; x <= od.x + od.w - 6; x += odSpc) outerDots.push({ cx: x, cy: od.y });
  for (let y = od.y + odSpc; y <= od.y + od.h - 6; y += odSpc) outerDots.push({ cx: od.x + od.w, cy: y });
  for (let x = od.x + od.w - odSpc; x >= od.x + 6; x -= odSpc) outerDots.push({ cx: x, cy: od.y + od.h });
  for (let y = od.y + od.h - odSpc; y > od.y + odSpc; y -= odSpc) outerDots.push({ cx: od.x, cy: y });

  return (
    <div className="ornate-frame">
      <div className="ornate-frame-clip">{children}</div>
      <svg className="ornate-frame-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Metallic gold — multiple shimmer bands */}
          <linearGradient id="ogGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#fff4c0" />
            <stop offset="12%"  stopColor="#d4a843" />
            <stop offset="28%"  stopColor="#f5e080" />
            <stop offset="48%"  stopColor="#9a6c14" />
            <stop offset="65%"  stopColor="#e8c050" />
            <stop offset="82%"  stopColor="#a07820" />
            <stop offset="100%" stopColor="#5c3c0c" />
          </linearGradient>

          {/* Ornament highlight — warm, bright center */}
          <radialGradient id="ogOrn" cx="28%" cy="25%" r="75%">
            <stop offset="0%"   stopColor="#fffae0" />
            <stop offset="18%"  stopColor="#f5e070" />
            <stop offset="50%"  stopColor="#c48818" />
            <stop offset="85%"  stopColor="#8a5c0e" />
            <stop offset="100%" stopColor="#5c3c0c" />
          </radialGradient>

          {/* Deep shadow gradient for carved recesses */}
          <radialGradient id="ogRecessed" cx="70%" cy="72%" r="55%">
            <stop offset="0%"   stopColor="#3a2006" />
            <stop offset="100%" stopColor="#1a0e02" />
          </radialGradient>

          {/* Specular carving filter — strong relief */}
          <filter id="ogCarve" x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.9" result="blur" />
            <feSpecularLighting in="blur" surfaceScale="9" specularConstant="2.4"
              specularExponent="40" result="spec">
              <fePointLight x="45" y="40" z="85" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut" />
            <feComposite in="SourceGraphic" in2="specOut"
              operator="arithmetic" k1="0" k2="1" k3="0.85" k4="0" />
          </filter>

          {/* Soft drop shadow for depth */}
          <filter id="ogDrop" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="1" dy="1.5" stdDeviation="1.4"
              floodColor="#2a1400" floodOpacity="0.8" />
          </filter>

          {/* Bead highlight filter */}
          <filter id="ogBead" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" result="b" />
            <feSpecularLighting in="b" surfaceScale="5" specularConstant="3"
              specularExponent="50" result="s">
              <fePointLight x="40" y="35" z="60" />
            </feSpecularLighting>
            <feComposite in="s" in2="SourceAlpha" operator="in" result="so" />
            <feComposite in="SourceGraphic" in2="so" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
        </defs>

        {/* ══ SHADOW DEPTH — offset dark band behind gold ══ */}
        <rect x="9.5" y="9.5" width="281" height="281"
          stroke="#1a0e02" strokeWidth="26" fill="none" opacity="0.7" />

        {/* ══ MAIN GOLD BAND ══ */}
        <rect x="10" y="10" width="280" height="280"
          stroke="url(#ogGold)" strokeWidth="20" fill="none" />

        {/* ══ CHASING LINES within band (engraved appearance) ══ */}
        <rect x="13.5" y="13.5" width="273" height="273"
          stroke="#c08018" strokeWidth="0.8" fill="none" opacity="0.55" />
        <rect x="16" y="16" width="268" height="268"
          stroke="#f8ec90" strokeWidth="0.4" fill="none" opacity="0.45" />
        <rect x="19" y="19" width="262" height="262"
          stroke="#9a6c14" strokeWidth="0.5" fill="none" opacity="0.4" />

        {/* ══ OUTER BORDER LINES ══ */}
        <rect x="1.5" y="1.5" width="297" height="297"
          stroke="#1a0e02" strokeWidth="3" fill="none" />
        <rect x="3.5" y="3.5" width="293" height="293"
          stroke="#f0cc50" strokeWidth="0.8" fill="none" />
        <rect x="5.5" y="5.5" width="289" height="289"
          stroke="#7a5810" strokeWidth="0.4" fill="none" />

        {/* Micro-dots along outer band edge (punched/chased texture) */}
        {outerDots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r="1.3"
            fill="#c08018" opacity="0.7" />
        ))}

        {/* ══ INNER BORDER LINES ══ */}
        <rect x="20" y="20" width="260" height="260"
          stroke="#7a5810" strokeWidth="0.4" fill="none" />
        <rect x="21.5" y="21.5" width="257" height="257"
          stroke="#f0cc50" strokeWidth="0.8" fill="none" />
        <rect x="23.5" y="23.5" width="253" height="253"
          stroke="#1a0e02" strokeWidth="2.2" fill="none" />

        {/* ══ INNER BEAD CHAIN ══ */}
        {beads.map((b, i) => (
          <circle key={i} cx={b.cx} cy={b.cy} r="2.2"
            fill="#d4a430" filter="url(#ogBead)" />
        ))}

        {/* ══ CORNER ORNAMENTS ══
            Each group: translate to corner, then rotate.
            Scrolls extend along +x (band top) and +y (band left).
            Diagonal leaf points toward outer corner. */}
        {corners.map(({ x, y, r }) => (
          <g key={r} transform={`translate(${x},${y}) rotate(${r})`}>

            {/* ── Central medallion ── */}
            <circle r="10" fill="#1a0e02" opacity="0.6" transform="translate(1.3,1.5)" />
            <circle r="9.5" fill="url(#ogOrn)" filter="url(#ogCarve)" />
            {/* Outer ring */}
            <circle r="9.5" fill="none" stroke="#f0cc50" strokeWidth="0.7" />
            {/* Engraved inner ring */}
            <circle r="6" fill="none" stroke="#9a6c14" strokeWidth="0.8" />
            {/* Carved cross */}
            <line x1="-4.5" y1="0" x2="4.5" y2="0" stroke="#f0cc50" strokeWidth="0.7" opacity="0.8" />
            <line x1="0" y1="-4.5" x2="0" y2="4.5" stroke="#f0cc50" strokeWidth="0.7" opacity="0.8" />
            {/* Center boss */}
            <circle r="2.8" fill="#d4a430" filter="url(#ogBead)" />
            {/* Ring of 8 micro-pearls */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
              const rad = a * Math.PI / 180;
              return (
                <circle key={a}
                  cx={12.5 * Math.cos(rad)} cy={12.5 * Math.sin(rad)}
                  r="1.7" fill="#c89030" filter="url(#ogBead)" />
              );
            })}

            {/* ── Right scroll (+x direction, along top-edge band) ── */}
            {/* Shadow */}
            <path d="M 10,0 C 17,-1 24,-5 22,-14 C 20,-23 11,-22 10,-16 C 9,-10 15,-5 21,-9"
              fill="none" stroke="#1a0e02" strokeWidth="5.5" strokeLinecap="round"
              opacity="0.55" transform="translate(1.3,1.5)" />
            {/* Main scroll body */}
            <path d="M 10,0 C 17,-1 24,-5 22,-14 C 20,-23 11,-22 10,-16 C 9,-10 15,-5 21,-9"
              fill="none" stroke="url(#ogOrn)" strokeWidth="4.5" strokeLinecap="round"
              filter="url(#ogCarve)" />
            {/* Light edge highlight on scroll */}
            <path d="M 10,0 C 17,-1 24,-5 22,-14 C 20,-23 11,-22 10,-16 C 9,-10 15,-5 21,-9"
              fill="none" stroke="#f8f0b0" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" />
            {/* Acanthus leaf bud at scroll tip */}
            <circle cx="21" cy="-9" r="1" fill="#1a0e02" opacity="0.5"
              transform="translate(1,1.2)" />
            <ellipse cx="21" cy="-9" rx="3.8" ry="6"
              fill="url(#ogOrn)" filter="url(#ogCarve)" stroke="#7a5010" strokeWidth="0.5"
              transform="rotate(-22,21,-9)" />
            <line x1="21" y1="-4" x2="21" y2="-14"
              stroke="#f0cc50" strokeWidth="0.5" opacity="0.65"
              transform="rotate(-22,21,-9)" />
            {/* Secondary branching scroll */}
            <path d="M 17,-12 C 22,-15 26,-13 25,-8"
              fill="none" stroke="url(#ogOrn)" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="25" cy="-8" rx="2.2" ry="3.8" fill="url(#ogOrn)"
              stroke="#7a5010" strokeWidth="0.4" transform="rotate(22,25,-8)" />
            {/* Tertiary tiny curl */}
            <path d="M 23,-4 C 26,-4 27,-2 25,-1"
              fill="none" stroke="#d4a430" strokeWidth="1.5" strokeLinecap="round" />
            {/* Pearl at extension tip */}
            <circle cx="24" cy="0" r="2.6" fill="#d4a430" filter="url(#ogBead)" />

            {/* ── Down scroll (+y direction, along left-edge band) ── */}
            <path d="M 0,10 C -1,17 -5,24 -14,22 C -23,20 -22,11 -16,10 C -10,9 -5,15 -9,21"
              fill="none" stroke="#1a0e02" strokeWidth="5.5" strokeLinecap="round"
              opacity="0.55" transform="translate(1.3,1.5)" />
            <path d="M 0,10 C -1,17 -5,24 -14,22 C -23,20 -22,11 -16,10 C -10,9 -5,15 -9,21"
              fill="none" stroke="url(#ogOrn)" strokeWidth="4.5" strokeLinecap="round"
              filter="url(#ogCarve)" />
            <path d="M 0,10 C -1,17 -5,24 -14,22 C -23,20 -22,11 -16,10 C -10,9 -5,15 -9,21"
              fill="none" stroke="#f8f0b0" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" />
            <circle cx="-9" cy="21" r="1" fill="#1a0e02" opacity="0.5"
              transform="translate(1,1.2)" />
            <ellipse cx="-9" cy="21" rx="6" ry="3.8"
              fill="url(#ogOrn)" filter="url(#ogCarve)" stroke="#7a5010" strokeWidth="0.5"
              transform="rotate(-68,-9,21)" />
            <line x1="-4" y1="21" x2="-14" y2="21"
              stroke="#f0cc50" strokeWidth="0.5" opacity="0.65"
              transform="rotate(-68,-9,21)" />
            {/* Secondary branch */}
            <path d="M -12,17 C -15,22 -13,26 -8,25"
              fill="none" stroke="url(#ogOrn)" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="-8" cy="25" rx="3.8" ry="2.2" fill="url(#ogOrn)"
              stroke="#7a5010" strokeWidth="0.4" transform="rotate(-22,-8,25)" />
            {/* Tertiary curl */}
            <path d="M -4,23 C -4,26 -2,27 -1,25"
              fill="none" stroke="#d4a430" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="0" cy="24" r="2.6" fill="#d4a430" filter="url(#ogBead)" />

            {/* ── Diagonal acanthus leaf (outer corner direction -x,-y) ── */}
            {/* Carved recess behind leaf */}
            <path d="M -8,-8 C -11,-15 -18,-22 -23,-18 C -28,-14 -22,-7 -16,-10 C -10,-13 -9,-20 -15,-22"
              fill="none" stroke="#1a0e02" strokeWidth="5" opacity="0.5"
              transform="translate(1.3,1.5)" />
            {/* Main leaf */}
            <path d="M -8,-8 C -11,-15 -18,-22 -23,-18 C -28,-14 -22,-7 -16,-10 C -10,-13 -9,-20 -15,-22"
              fill="url(#ogOrn)" stroke="#7a5010" strokeWidth="0.6"
              filter="url(#ogCarve)" />
            {/* Midrib */}
            <path d="M -8,-8 C -13,-13 -18,-18 -22,-17"
              fill="none" stroke="#f0cc50" strokeWidth="0.6" opacity="0.75" />
            {/* Secondary branching leaf */}
            <path d="M -16,-10 C -20,-9 -25,-12 -23,-17"
              fill="url(#ogOrn)" stroke="#7a5010" strokeWidth="0.5"
              filter="url(#ogCarve)" />
            {/* Tertiary leaf tip */}
            <path d="M -9,-20 C -7,-25 -10,-28 -15,-26"
              fill="url(#ogOrn)" stroke="#7a5010" strokeWidth="0.4" />
            {/* Tip curl */}
            <path d="M -15,-26 C -18,-26 -20,-24 -19,-22"
              fill="none" stroke="#d4a430" strokeWidth="1.5" strokeLinecap="round" />
            {/* Outer corner pearl */}
            <circle cx="-22" cy="-22" r="2.2" fill="#d4a430" filter="url(#ogBead)" />
          </g>
        ))}

        {/* ══ MID-EDGE ORNAMENTS ══
            Petals extend in +y (toward image interior after rotation).
            Scrolls extend in ±x (along the band). */}
        {mids.map(({ x, y, r }) => (
          <g key={`m${r}`} transform={`translate(${x},${y}) rotate(${r})`}>

            {/* ── Shell / coquille base (sits on the band) ── */}
            <ellipse cx="0" cy="0" rx="14" ry="7"
              fill="#1a0e02" opacity="0.55" transform="translate(1.2,1.4)" />
            <ellipse cx="0" cy="0" rx="13" ry="6.5"
              fill="url(#ogOrn)" filter="url(#ogCarve)" />
            {/* Shell ribs */}
            {[-8, -5, -2, 1, 4, 7].map(o => (
              <line key={o} x1={o} y1="-4.5" x2={o * 0.55} y2="4.5"
                stroke="#7a5010" strokeWidth="0.65" />
            ))}
            <ellipse cx="0" cy="0" rx="13" ry="6.5"
              fill="none" stroke="#f0cc50" strokeWidth="0.55" />

            {/* ── Central fleur petal (main, +y = inward) ── */}
            <ellipse cx="0" cy="0" rx="1" ry="1"
              fill="#1a0e02" opacity="0.4" transform="translate(1,1.3) translate(0,17) scale(5,9)" />
            <ellipse cx="0" cy="17" rx="5" ry="9.5"
              fill="url(#ogOrn)" filter="url(#ogCarve)" stroke="#7a5010" strokeWidth="0.5" />
            <line x1="0" y1="9" x2="0" y2="26"
              stroke="#f0cc50" strokeWidth="0.55" opacity="0.7" />
            {/* Petal tip pearl */}
            <circle cx="0" cy="27" r="2.4" fill="#d4a430" filter="url(#ogBead)" />

            {/* ── Left main petal ── */}
            <ellipse cx="-11" cy="13" rx="4.2" ry="7.5"
              fill="url(#ogOrn)" filter="url(#ogCarve)"
              stroke="#7a5010" strokeWidth="0.45"
              transform="rotate(36,-11,13)" />
            <line x1="-11" y1="7" x2="-11" y2="19"
              stroke="#f0cc50" strokeWidth="0.5" opacity="0.6"
              transform="rotate(36,-11,13)" />

            {/* ── Right main petal ── */}
            <ellipse cx="11" cy="13" rx="4.2" ry="7.5"
              fill="url(#ogOrn)" filter="url(#ogCarve)"
              stroke="#7a5010" strokeWidth="0.45"
              transform="rotate(-36,11,13)" />
            <line x1="11" y1="7" x2="11" y2="19"
              stroke="#f0cc50" strokeWidth="0.5" opacity="0.6"
              transform="rotate(-36,11,13)" />

            {/* ── Outer left petal (smaller) ── */}
            <ellipse cx="-19" cy="8" rx="3.2" ry="6"
              fill="url(#ogOrn)" filter="url(#ogCarve)"
              stroke="#7a5010" strokeWidth="0.4"
              transform="rotate(52,-19,8)" />

            {/* ── Outer right petal (smaller) ── */}
            <ellipse cx="19" cy="8" rx="3.2" ry="6"
              fill="url(#ogOrn)" filter="url(#ogCarve)"
              stroke="#7a5010" strokeWidth="0.4"
              transform="rotate(-52,19,8)" />

            {/* ── Far outer petals (tiny) ── */}
            <ellipse cx="-24" cy="4" rx="2.4" ry="4.5"
              fill="url(#ogOrn)" stroke="#7a5010" strokeWidth="0.35"
              transform="rotate(65,-24,4)" />
            <ellipse cx="24" cy="4" rx="2.4" ry="4.5"
              fill="url(#ogOrn)" stroke="#7a5010" strokeWidth="0.35"
              transform="rotate(-65,24,4)" />

            {/* ── Left scroll (along -x / band) ── */}
            <path d="M -13,0 C -19,1.5 -26,-3 -24,-10 C -22,-17 -14,-14 -15,-9"
              fill="none" stroke="#1a0e02" strokeWidth="4.5" strokeLinecap="round"
              opacity="0.5" transform="translate(1.2,1.4)" />
            <path d="M -13,0 C -19,1.5 -26,-3 -24,-10 C -22,-17 -14,-14 -15,-9"
              fill="none" stroke="url(#ogOrn)" strokeWidth="3.5" strokeLinecap="round"
              filter="url(#ogCarve)" />
            <ellipse cx="-24" cy="-10" rx="2.8" ry="4.5" fill="url(#ogOrn)"
              stroke="#7a5010" strokeWidth="0.4" transform="rotate(28,-24,-10)" />
            {/* Scroll secondary curl */}
            <path d="M -20,-10 C -24,-13 -26,-11 -25,-8"
              fill="none" stroke="#d4a430" strokeWidth="1.8" strokeLinecap="round" />

            {/* ── Right scroll (along +x / band) ── */}
            <path d="M 13,0 C 19,1.5 26,-3 24,-10 C 22,-17 14,-14 15,-9"
              fill="none" stroke="#1a0e02" strokeWidth="4.5" strokeLinecap="round"
              opacity="0.5" transform="translate(1.2,1.4)" />
            <path d="M 13,0 C 19,1.5 26,-3 24,-10 C 22,-17 14,-14 15,-9"
              fill="none" stroke="url(#ogOrn)" strokeWidth="3.5" strokeLinecap="round"
              filter="url(#ogCarve)" />
            <ellipse cx="24" cy="-10" rx="2.8" ry="4.5" fill="url(#ogOrn)"
              stroke="#7a5010" strokeWidth="0.4" transform="rotate(-28,24,-10)" />
            <path d="M 20,-10 C 24,-13 26,-11 25,-8"
              fill="none" stroke="#d4a430" strokeWidth="1.8" strokeLinecap="round" />

            {/* ── Central boss ── */}
            <circle r="1" fill="#1a0e02" opacity="0.5" transform="translate(1,1.3) scale(5)" />
            <circle r="5" fill="url(#ogOrn)" filter="url(#ogCarve)" />
            <circle r="5" fill="none" stroke="#f0cc50" strokeWidth="0.55" />
            <circle r="2.5" fill="#d4a430" filter="url(#ogBead)" />

            {/* ── Flanking pearl groups ── */}
            <circle cx="-28" cy="0" r="2.5" fill="#d4a430" filter="url(#ogBead)" />
            <circle cx="28" cy="0" r="2.5" fill="#d4a430" filter="url(#ogBead)" />
            <circle cx="-32" cy="0" r="1.8" fill="#c08018" />
            <circle cx="32" cy="0" r="1.8" fill="#c08018" />
            <circle cx="-35.5" cy="0" r="1.2" fill="#a06814" />
            <circle cx="35.5" cy="0" r="1.2" fill="#a06814" />
          </g>
        ))}
      </svg>
    </div>
  );
}
