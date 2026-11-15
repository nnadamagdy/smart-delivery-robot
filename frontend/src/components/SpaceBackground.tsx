export default function SpaceBackground() {
  return (
    <div className="space" aria-hidden="true">
      <div className="stars" /><div className="stars2" />
      <i className="shoot" style={{ top: '12%', left: '8%' }} /><i className="shoot" style={{ top: '38%', left: '45%', animationDelay: '4.5s' }} />
      <svg viewBox="0 0 520 360" className="absolute -right-28 -bottom-24 w-[620px] max-w-[90vw]">
        <defs>
          <radialGradient id="sat" cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#fde68a" /><stop offset=".5" stopColor="#f59e0b" /><stop offset="1" stopColor="#7c2d12" /></radialGradient>
          <clipPath id="front"><rect x="0" y="180" width="520" height="200" /></clipPath>
        </defs>
        <g transform="rotate(-18 260 180)">
          <ellipse cx="260" cy="180" rx="250" ry="52" fill="none" stroke="#fcd34d" strokeOpacity=".55" strokeWidth="16" />
          <circle cx="260" cy="180" r="112" fill="url(#sat)" />
          <ellipse cx="260" cy="180" rx="250" ry="52" fill="none" stroke="#fde68a" strokeOpacity=".8" strokeWidth="16" clipPath="url(#front)" />
        </g>
      </svg>
      <svg viewBox="0 0 200 200" className="absolute -left-16 top-28 w-[210px]">
        <defs><radialGradient id="mars" cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#fb7185" /><stop offset=".55" stopColor="#be123c" /><stop offset="1" stopColor="#4c0519" /></radialGradient></defs>
        <circle cx="100" cy="100" r="95" fill="url(#mars)" /><circle cx="130" cy="70" r="14" fill="#000" opacity=".18" /><circle cx="75" cy="130" r="20" fill="#000" opacity=".15" />
      </svg>
      <svg viewBox="0 0 100 100" className="absolute right-[14%] top-24 w-[70px]">
        <defs><radialGradient id="moon" cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#f1f5f9" /><stop offset="1" stopColor="#475569" /></radialGradient></defs>
        <circle cx="50" cy="50" r="46" fill="url(#moon)" /><circle cx="36" cy="40" r="8" fill="#334155" opacity=".4" /><circle cx="62" cy="62" r="11" fill="#334155" opacity=".35" />
      </svg>
    </div>)
}
