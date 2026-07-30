import { memo } from "react";

const MOTES = [
  { left: "12%", top: "70%", animationDelay: "0s" },
  { left: "18%", top: "55%", animationDelay: "3s" },
  { left: "85%", top: "65%", animationDelay: "6s" },
  { left: "80%", top: "40%", animationDelay: "2s" },
  { left: "50%", top: "8%", animationDelay: "8s" },
  { left: "30%", top: "20%", animationDelay: "5s" },
];

// Static cave scene lifted from round1-mockup-v3.html: fixed full-viewport SVG
// (walls, ceiling, torch glow, rail track, distant cart) plus a vignette overlay
// and an optional drifting dust-mote layer. Memoized with no dynamic props so it
// mounts once and is skipped on parent re-renders instead of re-rendering with them.
function CaveBackground({ motes = true }: { motes?: boolean }) {
  return (
    <>
      <div className="scene" aria-hidden="true">
        <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="torchL" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e8b13d" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#e8b13d" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="rockFace" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#241c12" />
              <stop offset="100%" stopColor="#0b0906" />
            </linearGradient>
          </defs>

          <rect width="1600" height="1000" fill="#0b0906" />

          {/* torch glow pools */}
          <circle cx="220" cy="260" r="280" fill="url(#torchL)" />
          <circle cx="1400" cy="640" r="320" fill="url(#torchL)" />
          <circle cx="800" cy="60" r="240" fill="url(#torchL)" />

          {/* far background cave wall, faint, sets depth */}
          <path
            d="M0,1000 L0,300
      C 120,220 260,260 340,180
      C 460,80 600,120 760,60
      C 940,0 1100,40 1260,10
      C 1400,-10 1520,60 1600,40
      L1600,1000 Z"
            fill="#140f0a"
            opacity="0.55"
          />

          {/* left cave wall, organic and rounded, closer / darker */}
          <path
            d="M0,0 L260,0
      C 210,90 250,170 180,250
      C 110,330 200,420 140,510
      C 90,590 190,660 120,760
      C 70,840 160,920 90,1000
      L0,1000 Z"
            fill="url(#rockFace)"
          />

          {/* right cave wall, mirrored */}
          <path
            d="M1600,0 L1340,0
      C 1390,100 1350,190 1420,270
      C 1490,350 1400,440 1460,530
      C 1510,610 1420,690 1490,780
      C 1540,850 1450,930 1520,1000
      L1600,1000 Z"
            fill="url(#rockFace)"
          />

          {/* ceiling, low and rounded like a real cave mouth, curving down at the sides */}
          <path
            d="M0,0 L1600,0 L1600,150
      C 1420,60 1300,180 1150,90
      C 1020,15 900,110 760,50
      C 630,-5 500,90 380,40
      C 260,-5 150,110 0,60 Z"
            fill="url(#rockFace)"
          />

          {/* stalactites hanging from the ceiling */}
          <g fill="#0e0a05">
            <path d="M260,150 C 250,190 270,230 265,270 C 280,235 285,190 260,150 Z" />
            <path d="M420,80 C 405,140 435,190 425,240 C 448,195 452,130 420,80 Z" />
            <path d="M980,90 C 965,150 995,210 985,260 C 1010,215 1015,145 980,90 Z" />
            <path d="M1180,140 C 1168,175 1190,215 1182,250 C 1202,215 1206,175 1180,140 Z" />
          </g>

          {/* stalagmites rising near the edges, kept clear of center */}
          <g fill="#0e0a05">
            <path d="M110,1000 C 100,950 130,910 118,860 C 150,905 160,960 110,1000 Z" />
            <path d="M1510,1000 C 1522,940 1490,900 1505,850 C 1470,900 1460,960 1510,1000 Z" />
          </g>

          {/* support beam */}
          <rect x="150" y="0" width="26" height="180" fill="#2a1c0f" />
          <rect x="1400" y="0" width="26" height="150" fill="#2a1c0f" />
          <rect x="115" y="150" width="96" height="20" fill="#2a1c0f" />
          <rect x="1365" y="120" width="96" height="20" fill="#2a1c0f" />

          {/* rail track leading toward the frame */}
          <path d="M600,1000 L680,760 M1000,1000 L920,760" stroke="#2a2013" strokeWidth="10" strokeLinecap="round" />
          <g stroke="#1c1509" strokeWidth="8">
            <line x1="612" y1="960" x2="988" y2="960" />
            <line x1="632" y1="900" x2="968" y2="900" />
            <line x1="652" y1="840" x2="948" y2="840" />
            <line x1="670" y1="790" x2="930" y2="790" />
          </g>

          {/* distant cart, faint */}
          <g opacity="0.5" transform="translate(1420,780)">
            <rect x="0" y="0" width="70" height="38" rx="4" fill="#1c140b" />
            <circle cx="14" cy="42" r="9" fill="#0e0a05" />
            <circle cx="56" cy="42" r="9" fill="#0e0a05" />
          </g>
        </svg>
        <div className="vignette" />
      </div>

      {motes && MOTES.map((m, i) => <div key={i} className="mote" style={m} />)}
    </>
  );
}

export default memo(CaveBackground);
