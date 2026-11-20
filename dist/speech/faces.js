// Face icons drawn as SVG (head only, flat, no outline); one look per speaker, one expression per emotion.
// bea, jenie (female), sam, josh (male).
// Coordinates are the TikZ ones (y up): everything is drawn inside a group flipped with scale(1,-1).

const FEAT = '#3c2626';                       // featcol RGB(60,38,38)
const SKIN = '#ffe0c6';                       // skin RGB(255,224,198)

const LOOKS = {
  bea:   { hair: '#694028', hs: 1.0, ears: false },
  jenie: { hair: '#2a2230', hs: 1.0, ears: false },
  sam:   { hair: '#2a2626', hs: 1.1, ears: true },
  josh:  { hair: '#a8743e', hs: 1.1, ears: true },
};

const HAIR_BACK = {
  bea: 'M-0.6,-0.5 C-0.72,0.1 -0.7,0.8 0,0.8 C0.7,0.8 0.72,0.1 0.6,-0.5 C0.35,-0.56 -0.35,-0.56 -0.6,-0.5 Z',
  // long straight hair, centre parting
  jenie: 'M-0.63,-0.66 C-0.74,0.1 -0.72,0.84 0,0.84 C0.72,0.84 0.74,0.1 0.63,-0.66 C0.42,-0.6 0.3,-0.62 0.2,-0.66 L-0.2,-0.66 C-0.3,-0.62 -0.42,-0.6 -0.63,-0.66 Z',
  sam: 'M-0.52,0.2 C-0.58,1.02 0.58,1.02 0.52,0.2 Z',
  // a little higher on top: quiff
  josh: 'M-0.52,0.2 C-0.6,1.08 0.6,1.1 0.52,0.2 Z',
};

const HAIR_FRONT = {
  bea: ['M-0.6,0.15 C-0.35,0.62 0.05,0.4 0.6,0.36 L0.6,0.9 L-0.6,0.9 Z'],
  jenie: ['M-0.6,0.05 C-0.5,0.42 -0.2,0.56 0,0.6 L0,0.9 L-0.6,0.9 Z',
          'M0.6,0.05 C0.5,0.42 0.2,0.56 0,0.6 L0,0.9 L0.6,0.9 Z'],
  sam: ['M-0.55,0.38 C-0.25,0.47 0.1,0.36 0.55,0.45 L0.55,0.9 L-0.55,0.9 Z',
        'M-0.56,0.4 L-0.43,0.4 L-0.46,0.14 L-0.56,0.14 Z',
        'M0.56,0.45 L0.43,0.45 L0.46,0.14 L0.56,0.14 Z'],
  josh: ['M-0.55,0.46 C-0.3,0.5 -0.05,0.62 0.12,0.48 C0.25,0.4 0.42,0.42 0.55,0.5 L0.55,0.95 L-0.55,0.95 Z',
         'M-0.56,0.42 L-0.45,0.42 L-0.47,0.22 L-0.56,0.22 Z',
         'M0.56,0.45 L0.45,0.45 L0.47,0.22 L0.56,0.22 Z'],
};

// expressions on a unit face (eyes at y = 0, mouth at y = -0.5); line width in these units
const LW = 0.09;
const line = (d, w = LW) => `<path d="${d}" fill="none" stroke="${FEAT}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const eyeHL = '<circle cx="-0.32" cy="0.04" r="0.035" fill="#fff"/><circle cx="0.4" cy="0.04" r="0.035" fill="#fff"/>';
const dotsEyes = `<circle cx="-0.36" cy="0" r="0.1" fill="${FEAT}"/><circle cx="0.36" cy="0" r="0.1" fill="${FEAT}"/>` + eyeHL;
// text is drawn upright again inside the flipped group
const txt = (x, y, size, s) => `<text x="0" y="0" transform="translate(${x},${y}) scale(1,-1)" font-family="system-ui,sans-serif" font-weight="700" font-size="${size}" fill="#776767" text-anchor="middle" dominant-baseline="middle">${s}</text>`;

function expression(emo, uid) {
  switch (emo) {
    case 'Neutral':
      return dotsEyes + line('M-0.52,0.3 L-0.2,0.3') + line('M0.2,0.3 L0.52,0.3') + line('M-0.22,-0.5 L0.22,-0.5');
    case 'Angry': {
      let s = dotsEyes + line('M-0.56,0.4 L-0.17,0.2') + line('M0.17,0.2 L0.56,0.4') +
        line('M-0.28,-0.6 C-0.12,-0.38 0.12,-0.38 0.28,-0.6');
      // anger mark (four bent strokes)
      s += '<g transform="translate(0.98,0.9) scale(0.2)">';
      for (const r of [0, 90, 180, 270])
        s += `<path d="M0.35,1.1 Q0.35,0.35 1.1,0.35" transform="rotate(${-r})" fill="none" stroke="#cc0000" stroke-width="0.36" stroke-linecap="round"/>`;
      return s + '</g>';
    }
    case 'Amused':
      return '<ellipse cx="-0.62" cy="-0.26" rx="0.16" ry="0.09" fill="#ffcccc"/><ellipse cx="0.62" cy="-0.26" rx="0.16" ry="0.09" fill="#ffcccc"/>' +
        line('M-0.5,-0.02 C-0.44,0.18 -0.28,0.18 -0.22,-0.02') + line('M0.22,-0.02 C0.28,0.18 0.44,0.18 0.5,-0.02') +
        line('M-0.54,0.32 C-0.45,0.43 -0.3,0.43 -0.2,0.36') + line('M0.2,0.36 C0.3,0.43 0.45,0.43 0.54,0.32') +
        `<path d="M-0.34,-0.3 C-0.26,-0.76 0.26,-0.76 0.34,-0.3 Z" fill="#8c0000" stroke="${FEAT}" stroke-width="${LW}" stroke-linejoin="round"/>`;
    case 'Disgusted':
      return `<defs><linearGradient id="g${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46b900" stop-opacity="0.45"/><stop offset="1" stop-color="#46b900" stop-opacity="0"/></linearGradient>` +
        `<clipPath id="f${uid}"><ellipse cx="0" cy="0.077" rx="1" ry="1.077"/></clipPath></defs>` +
        // bounding-box gradient from local y = -1.2 (bottom of the face, opaque) to y = -0.05 (transparent)
        `<rect x="-1.1" y="-1.2" width="2.2" height="1.15" fill="url(#g${uid})" clip-path="url(#f${uid})"/>` +
        line('M-0.5,0.02 L-0.22,0') + `<circle cx="0.36" cy="0" r="0.1" fill="${FEAT}"/>` +
        line('M-0.56,0.18 L-0.2,0.2') + line('M0.2,0.34 C0.3,0.46 0.45,0.46 0.56,0.36') +
        line('M-0.3,-0.46 C-0.18,-0.36 -0.06,-0.6 0.06,-0.5 C0.16,-0.43 0.24,-0.5 0.32,-0.58');
    case 'Sleepy':
      return line('M-0.5,0.02 C-0.42,-0.1 -0.3,-0.1 -0.22,0.02') + line('M0.22,0.02 C0.3,-0.1 0.42,-0.1 0.5,0.02') +
        line('M-0.54,0.2 L-0.22,0.28') + line('M0.22,0.28 L0.54,0.2') +
        `<circle cx="0" cy="-0.5" r="0.09" fill="none" stroke="${FEAT}" stroke-width="${LW}"/>` +
        txt(1.0, 0.5, 0.42, 'z') + txt(1.27, 0.92, 0.58, 'Z');
  }
  return '';
}

let faceCounter = 0;

/** SVG markup of a speaker's face with an emotion. */
function faceSVG(speaker, emotion, opts = {}) {
  const L = LOOKS[speaker];
  const uid = `${speaker}${emotion}${++faceCounter}`;
  const s = 1.45 * L.hs / 1.6;                // keep sam/josh's heads a little bigger, as in the talk
  let g = `<path d="${HAIR_BACK[speaker]}" fill="${L.hair}"/>`;
  if (L.ears) g += `<ellipse cx="-0.5" cy="0.1" rx="0.08" ry="0.12" fill="${SKIN}"/><ellipse cx="0.5" cy="0.1" rx="0.08" ry="0.12" fill="${SKIN}"/>`;
  g += `<ellipse cx="0" cy="0.12" rx="0.5" ry="0.56" fill="${SKIN}"/>`;
  g += `<clipPath id="h${uid}"><ellipse cx="0" cy="0.12" rx="0.5" ry="0.56"/></clipPath><g clip-path="url(#h${uid})">` +
       HAIR_FRONT[speaker].map(d => `<path d="${d}" fill="${L.hair}"/>`).join('') + '</g>';
  g += '<ellipse cx="-0.3" cy="-0.08" rx="0.08" ry="0.045" fill="#ffd3d3" opacity="0.8"/><ellipse cx="0.3" cy="-0.08" rx="0.08" ry="0.045" fill="#ffd3d3" opacity="0.8"/>';
  g += `<g transform="translate(0,0.08) scale(0.5,0.52)">${expression(emotion, uid)}</g>`;
  const title = opts.title === false ? '' : `<title>${speaker}, ${emotion.toLowerCase()}</title>`;
  return `<svg class="face ${opts.cls || ''}" viewBox="-0.95 -1.0 1.9 1.9" aria-label="${speaker}, ${emotion}" role="img">${title}` +
         `<g transform="scale(${s},${-s}) translate(0,-0.12)">${g}</g></svg>`;
}
