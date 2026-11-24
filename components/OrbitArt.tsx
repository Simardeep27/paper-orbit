export function OrbitArt() {
  return (
    <div className="orbit-art" aria-hidden="true">
      <svg viewBox="0 0 520 520" role="presentation">
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F3F5FA" stopOpacity="0.95" />
            <stop offset="38%" stopColor="#5DD6F4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#5DD6F4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="orbitStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5DD6F4" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#B69CFF" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <circle cx="260" cy="260" r="176" fill="none" stroke="#30405B" strokeOpacity="0.6" />
        <circle cx="260" cy="260" r="132" fill="none" stroke="#30405B" strokeOpacity="0.45" strokeDasharray="3 8" />
        <circle cx="260" cy="260" r="86" fill="none" stroke="#30405B" strokeOpacity="0.35" />

        <g className="orbit-spin-slow">
          <ellipse
            cx="260"
            cy="260"
            rx="206"
            ry="112"
            fill="none"
            stroke="url(#orbitStroke)"
            strokeWidth="1.2"
            transform="rotate(-24 260 260)"
          />
          <circle cx="442" cy="214" r="4.5" fill="#5DD6F4" />
          <circle cx="104" cy="330" r="3.5" fill="#F6BE5A" />
          <circle cx="382" cy="377" r="3" fill="#B69CFF" />
        </g>

        <g className="orbit-spin-reverse">
          <ellipse
            cx="260"
            cy="260"
            rx="168"
            ry="204"
            fill="none"
            stroke="url(#orbitStroke)"
            strokeWidth="1"
            transform="rotate(38 260 260)"
          />
          <circle cx="300" cy="67" r="4" fill="#F6BE5A" />
          <circle cx="168" cy="447" r="3.5" fill="#5DD6F4" />
          <circle cx="418" cy="309" r="3" fill="#5DD6F4" />
        </g>

        <g opacity="0.9">
          <line x1="260" y1="260" x2="357" y2="155" stroke="#5DD6F4" strokeOpacity="0.32" />
          <line x1="260" y1="260" x2="397" y2="314" stroke="#F6BE5A" strokeOpacity="0.3" />
          <line x1="260" y1="260" x2="185" y2="365" stroke="#B69CFF" strokeOpacity="0.34" strokeDasharray="4 5" />
          <line x1="260" y1="260" x2="140" y2="173" stroke="#5DD6F4" strokeOpacity="0.24" />
          <line x1="260" y1="260" x2="329" y2="389" stroke="#F6BE5A" strokeOpacity="0.26" />
        </g>

        <g className="orbit-node">
          <circle cx="357" cy="155" r="9" fill="#5DD6F4" />
          <circle cx="357" cy="155" r="15" fill="none" stroke="#5DD6F4" strokeOpacity="0.25" />
        </g>
        <g className="orbit-node">
          <circle cx="397" cy="314" r="7" fill="#F6BE5A" />
          <circle cx="397" cy="314" r="12" fill="none" stroke="#F6BE5A" strokeOpacity="0.22" />
        </g>
        <g className="orbit-node">
          <circle cx="185" cy="365" r="6.5" fill="#B69CFF" />
          <circle cx="185" cy="365" r="12" fill="none" stroke="#B69CFF" strokeOpacity="0.22" />
        </g>
        <circle cx="140" cy="173" r="5" fill="#5DD6F4" opacity="0.85" />
        <circle cx="329" cy="389" r="4.5" fill="#F6BE5A" opacity="0.85" />
        <circle cx="213" cy="113" r="3.5" fill="#B69CFF" opacity="0.75" />
        <circle cx="393" cy="238" r="3" fill="#F3F5FA" opacity="0.55" />

        <circle cx="260" cy="260" r="48" fill="url(#centerGlow)" />
        <circle cx="260" cy="260" r="13" fill="#F3F5FA" />
        <circle cx="260" cy="260" r="23" fill="none" stroke="#F3F5FA" strokeOpacity="0.65" strokeWidth="1.2" />
        <circle cx="260" cy="260" r="34" fill="none" stroke="#F3F5FA" strokeOpacity="0.22" strokeDasharray="2 5" />
      </svg>
    </div>
  );
}
