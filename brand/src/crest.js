/* Shared KRALDOR crest markup — the exact geometry of src/components/ui/Logo.tsx
   (48x48 viewBox), plus a gold bloom + ember that only the poster art needs. */
function crest(id, size) {
  return `
<svg viewBox="0 0 48 48" width="${size}" height="${size}">
  <defs>
    <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c1720"/><stop offset="1" stop-color="#0b0a0e"/>
    </linearGradient>
    <linearGradient id="${id}-blade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e4c35a"/><stop offset="1" stop-color="#a9861f"/>
    </linearGradient>
    <filter id="${id}-bloom" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="1.1" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <path d="M24 3l17 5v13c0 11-7.5 18-17 23C14.5 39 7 32 7 21V8z"
        fill="url(#${id}-body)" stroke="#c4a032" stroke-width="1.6"/>
  <path d="M24 6.4l14 4.1v10.6c0 9.3-6.2 15.4-14 19.7-7.8-4.3-14-10.4-14-19.7V10.5z"
        fill="none" stroke="#d6c9ad" stroke-width="0.9" opacity="0.35"/>
  <path d="M16 9l4 3 4-4 4 4 4-3-1.4 5H17.4z" fill="#d6c9ad" opacity="0.85"/>
  <g filter="url(#${id}-bloom)">
    <path d="M24 15l3 3-3 14-3-14z" fill="url(#${id}-blade)"/>
    <rect x="18.5" y="14.2" width="11" height="2.4" rx="1" fill="#d6c9ad"/>
    <circle cx="24" cy="34" r="1.6" fill="#e4c35a"/>
  </g>
</svg>`;
}
