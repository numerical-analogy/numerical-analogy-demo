// Interactive converter. Audio files (made by tools/build_audio.py):
//   audio/<sentence>_<speaker>_<emotion>_real.mp3                      real recording (vocoded)
//   audio/<sentence>_<speaker>_<emotion>_to_<speaker'>_<emotion'>.mp3  conversion by the model
const SPEAKERS = ['bea', 'jenie', 'sam', 'josh'];
const GENDER = { bea: 'female', jenie: 'female', sam: 'male', josh: 'male' };
const EMOTIONS = ['Neutral', 'Amused', 'Angry', 'Sleepy', 'Disgusted'];
const MISSING = new Set(['josh/Angry', 'josh/Disgusted']);
const REF_FOR_MISSING = 'sam';
const SENTENCES = [
  { id: '0044', text: 'Her own betrayal of herself was like tonic to Philip.' },
  { id: '0046', text: 'The girl faced him, her eyes shining with sudden fear.' },
  { id: '0043', text: 'It seemed nearer to him since he had seen and talked with Gregson.' },
];

const state = { sentence: SENTENCES[0].id, from: ['bea', 'Neutral'], to: ['sam', 'Angry'] };
const $ = (s) => document.querySelector(s);
const isMissing = (s, e) => MISSING.has(`${s}/${e}`);
const realUrl = (s, e) => `audio/${state.sentence}_${s}_${e}_real.mp3`;
const convUrl = () => `audio/${state.sentence}_${state.from.join('_')}_to_${state.to.join('_')}.mp3`;
const lc = (e) => e.toLowerCase();

/* ---------- one shared audio player ---------- */
const player = new Audio();
player.preload = 'auto';
let activeBtn = null;
function stop() {
  player.pause();
  if (activeBtn) { activeBtn.classList.remove('playing'); const f = activeBtn.querySelector('.fill'); if (f) f.style.width = '0'; }
  activeBtn = null;
  document.querySelector('.flow').classList.remove('playing-flow');
}
function play(url, btn) {
  if (activeBtn === btn && !player.paused) { stop(); return; }
  stop();
  activeBtn = btn;
  btn.classList.add('playing');
  if (btn.id === 'play-converted') document.querySelector('.flow').classList.add('playing-flow');
  player.src = url;
  player.currentTime = 0;
  player.play().catch(() => stop());
}
player.addEventListener('timeupdate', () => {
  const f = activeBtn && activeBtn.querySelector('.fill');
  if (f && player.duration) f.style.width = `${(100 * player.currentTime) / player.duration}%`;
});
player.addEventListener('ended', stop);

/* ---------- sentence chooser ---------- */
function renderSentences() {
  const box = $('#sentences');
  box.innerHTML = '';
  for (const s of SENTENCES) {
    const b = document.createElement('button');
    b.className = 'sentence';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(s.id === state.sentence));
    b.innerHTML = `<span class="id">arctic_a${s.id}</span><span class="t">&ldquo;${s.text}&rdquo;</span>`;
    b.onclick = () => { state.sentence = s.id; stop(); renderSentences(); };
    box.appendChild(b);
  }
}

/* ---------- 4 x 5 grids of faces ---------- */
function renderGrid(which) {
  const grid = $(`#${which}-grid`);
  grid.innerHTML = '<div></div>' + EMOTIONS.map(e => `<div class="colh" style="color:var(--${e})">${e}</div>`).join('');
  for (const s of SPEAKERS) {
    grid.insertAdjacentHTML('beforeend', `<div class="rowh" style="color:var(--${s})">${s}<small>${GENDER[s]}</small></div>`);
    for (const e of EMOTIONS) {
      const b = document.createElement('button');
      b.className = 'cell';
      b.dataset.s = s; b.dataset.e = e;
      const missing = isMissing(s, e);
      b.innerHTML = faceSVG(s, e, { title: false });
      if (which === 'from' && missing) {
        b.disabled = true;
        b.setAttribute('aria-label', `${s}, ${lc(e)}: not recorded`);
        b.title = `${s} did not record ${lc(e)} speech`;
      } else {
        b.setAttribute('aria-label', `${s}, ${lc(e)}`);
        b.title = `${s}, ${lc(e)}` + (missing ? ' (never recorded: solved by analogy)' : '');
        if (missing) b.insertAdjacentHTML('beforeend', '<span class="badge" aria-hidden="true">A</span>');
        b.onclick = () => select(which, s, e);
      }
      grid.appendChild(b);
    }
  }
  markSelected(which);
}
function markSelected(which) {
  const [s, e] = state[which];
  document.querySelectorAll(`#${which}-grid .cell`).forEach(c =>
    c.setAttribute('aria-pressed', String(c.dataset.s === s && c.dataset.e === e)));
}
function select(which, s, e) {
  state[which] = [s, e];
  markSelected(which);
  renderResult(which);
  if (which === 'to') play(convUrl(), $('#play-converted'));   // clicking a target plays it right away
  else stop();
}

/* ---------- result panel ---------- */
function caption([s, e]) {
  return `<span style="color:var(--${s})">${s}</span>, <span class="e" style="color:var(--${e})">${lc(e)}</span>`;
}
function renderResult(changed) {
  const [fs, fe] = state.from, [ts, te] = state.to;
  for (const [side, [s, e]] of [['from', state.from], ['to', state.to]]) {
    const box = $(`#${side}-face`);
    box.innerHTML = faceSVG(s, e);
    if (side === changed) { box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); }
    $(`#${side}-cap`).innerHTML = caption([s, e]);
  }
  $('#chip-spk').textContent = `speaker vector of ${ts}`;
  $('#chip-spk').style.color = `var(--${ts})`;
  $('#chip-emo').textContent = `emotion vector: ${lc(te)}`;
  $('#chip-emo').style.color = `var(--${te})`;
  const tgt = $('#play-target');
  tgt.disabled = isMissing(ts, te);
  tgt.querySelector('.lbl').textContent = isMissing(ts, te) ? 'Never recorded' : 'Real recording';

  let note = '';
  if (isMissing(ts, te))
    note = `${ts} never recorded ${lc(te)} speech. His vectors are solved by numerical analogy: ` +
           `${REF_FOR_MISSING} neutral : ${REF_FOR_MISSING} ${lc(te)} :: ${ts} neutral : ?`;
  else if (fs === ts && fe === te)
    note = 'Same speaker and emotion: the model simply re-synthesises the recording (a sanity check).';
  else if (fs === ts)
    note = `Same voice, new emotion: ${lc(fe)} → ${lc(te)}.`;
  else if (fe === te)
    note = `Same emotion, new voice: ${fs} → ${ts}.`;
  else
    note = `Both change at once: ${fs}, ${lc(fe)} → ${ts}, ${lc(te)}.`;
  $('#result-note').textContent = note;
}
$('#play-source').onclick = (ev) => play(realUrl(...state.from), ev.currentTarget);
$('#play-converted').onclick = (ev) => play(convUrl(), ev.currentTarget);
$('#play-target').onclick = (ev) => play(realUrl(...state.to), ev.currentTarget);

renderSentences();
renderGrid('from');
renderGrid('to');
renderResult();
