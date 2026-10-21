'use strict';
/* ===== Konfigurasi: isi untuk mengaktifkan backend. Hanya URL & anon key (BUKAN service-role). ===== */
const CONFIG = { supabaseUrl: '', supabaseAnonKey: '' };

/* ===== Matematika murni (dapat diuji di Node) ===== */
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
function F(n, d = 1) { if (!d) throw new Error('Penyebut 0'); if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; }
const mul = (a, b) => F(a.n * b.n, a.d * b.d);
const div = (a, b) => F(a.n * b.d, a.d * b.n);
const cmp = (a, b) => Math.sign(a.n * b.d - b.n * a.d);
const eq = (a, b) => cmp(a, b) === 0;
const fmt = f => (f.d === 1 ? String(f.n) : f.n + '/' + f.d);
/* Format Indonesia: "3/4", "1 1/2", "0,6", "3". Titik desimal ditolak agar konsisten. */
function parseNum(s) {
  s = String(s).trim().replace(/\s+/g, ' '); let m;
  if ((m = s.match(/^(\d+)\/(\d+)$/))) return +m[2] === 0 ? null : F(+m[1], +m[2]);
  if ((m = s.match(/^(\d+) (\d+)\/(\d+)$/))) return +m[3] === 0 ? null : F(+m[1] * +m[3] + +m[2], +m[3]);
  if ((m = s.match(/^(\d+)(?:,(\d))?$/))) return m[2] === undefined ? F(+m[1]) : F(+m[1] * 10 + +m[2], 10);
  return null;
}
const stageScore = (done, wrong) => (!done ? 1 : wrong === 0 ? 4 : wrong === 1 ? 3 : 2);
const processScore = sc => Math.round(sc.reduce((a, b) => a + b, 0) / 16 * 100);
const validCode = s => /^[A-Za-z0-9_-]{3,20}$/.test(s);
const misplaced = (order, dir) => { const s = [...order].sort((x, y) => (dir === 'asc' ? cmp(x, y) : cmp(y, x))); return order.filter((v, i) => !eq(v, s[i])).length; };
const expected = it => (it.op === 'mul' ? mul : div)(F(it.a[0], it.a[1]), F(it.n));
const classifyM1 = (it, ans) => eq(ans, (it.op === 'mul' ? div : mul)(F(it.a[0], it.a[1]), F(it.n))) ? 'konsep' : 'operasi';
const csvCell = v => { let s = Array.isArray(v) ? v.join('|') : String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
const toCSV = (rows, cols) => '\uFEFF' + [cols.join(',')].concat(rows.map(r => cols.map(c => csvCell(r[c])).join(','))).join('\r\n');
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/* ===== Bank soal ===== */
const M1 = [
  ['Satu resep membutuhkan 3/4 liter sari buah. Berapa liter sari buah untuk 4 resep?', [3, 4], 4, 'mul', 'mudah'],
  ['Ibu memiliki 3/4 liter sari buah dan membagikannya sama rata kepada 3 anak. Berapa liter yang diterima setiap anak?', [3, 4], 3, 'div', 'mudah'],
  ['Satu botol berisi 2/5 liter madu. Kantin membeli 5 botol. Berapa liter madu seluruhnya?', [2, 5], 5, 'mul', 'sedang'],
  ['Kantin punya 4/5 kg gula yang dibagi sama rata ke 4 wadah. Berapa kg gula di tiap wadah?', [4, 5], 4, 'div', 'sedang'],
  ['Setiap gelas jus berisi 3/8 liter. Berapa liter jus untuk 6 gelas?', [3, 8], 6, 'mul', 'sedang'],
  ['Pita 2/3 meter dipotong menjadi 4 bagian sama panjang untuk hiasan stan. Berapa meter tiap potong?', [2, 3], 4, 'div', 'sedang'],
  ['Bu Rina memakai 5/6 kg tepung setiap hari selama 3 hari. Berapa kg tepung yang terpakai?', [5, 6], 3, 'mul', 'menantang'],
  ['Sebanyak 9/10 liter susu dibagi sama rata ke 6 cangkir. Berapa liter susu tiap cangkir?', [9, 10], 6, 'div', 'menantang']
].map(x => ({ t: x[0], a: x[1], n: x[2], op: x[3], lvl: x[4] }));
const M2 = [
  [['3/4', '0,6', '4/5', '0,7'], 'asc'], [['1/2', '0,3', '3/5', '0,4'], 'asc'], [['0,9', '7/10', '4/5', '1/2'], 'desc'],
  [['1/4', '0,3', '1/5', '0,5'], 'asc'], [['2/5', '0,3', '0,6', '1/2'], 'asc'], [['5/8', '0,6', '0,7', '3/4'], 'asc'],
  [['1/5', '0,1', '1/4', '0,3'], 'asc'], [['1 1/2', '1,3', '7/5', '1,6'], 'desc']
].map((x, i) => ({ v: x[0], dir: x[1], lvl: i < 2 ? 'mudah' : i < 6 ? 'sedang' : 'menantang' }));
/* Soal HOTS: C4 menganalisis, C5 mengevaluasi, C6 merancang solusi. Tiap tahap Polya punya pilihan yang dapat dinilai otomatis. */
const HOTS1 = [
 { t:'HOTS C4 • Panitia membuat 6 teko minuman. Setiap teko membutuhkan 3/4 liter sari buah. Persediaan hanya 4 liter. Analisislah apakah persediaan cukup dan berapa sisanya/kekurangannya.', lvl:'sulit', hots:[
  [{t:'Menentukan kebutuhan sari buah untuk 6 teko dan membandingkannya dengan 4 liter',ok:1},{t:'Menghitung banyaknya teko saja',ok:0},{t:'Menjumlahkan 6 dan 3/4',ok:0}],
  [{t:'Hitung 6 × 3/4, lalu bandingkan hasilnya dengan 4 liter',ok:1},{t:'Hitung 4 ÷ 3/4 lalu anggap itu jumlah liter yang dibutuhkan',ok:0},{t:'Kurangi 6 − 3/4',ok:0}],
  [{t:'Kebutuhan 4 1/2 liter; persediaan kurang 1/2 liter',ok:1},{t:'Kebutuhan 3 1/2 liter; persediaan sisa 1/2 liter',ok:0},{t:'Kebutuhan 4 liter tepat; tidak ada sisa',ok:0}],
  [{t:'Masuk akal: 6 × 3/4 = 18/4 = 4 1/2, lebih besar 1/2 liter dari 4 liter',ok:1},{t:'Masuk akal karena 3/4 lebih kecil dari 1 liter, jadi 6 teko pasti kurang dari 4 liter',ok:0},{t:'Tidak perlu memeriksa karena perkalian selalu menghasilkan bilangan bulat',ok:0}]
 ]},
 { t:'HOTS C5 • Dua siswa menghitung kebutuhan tepung untuk 5 loyang. Setiap loyang memerlukan 2/3 kg. Rani menjawab 10/3 kg, sedangkan Dito menjawab 2 2/3 kg. Nilailah jawaban mereka.', lvl:'sulit', hots:[
  [{t:'Membandingkan dua jawaban dengan menghitung 5 × 2/3',ok:1},{t:'Memilih jawaban yang ditulis sebagai bilangan campuran',ok:0},{t:'Menjumlahkan angka 5, 2, dan 3',ok:0}],
  [{t:'Ubah hasil perkalian menjadi pecahan biasa lalu sederhanakan atau ubah ke campuran',ok:1},{t:'Kalikan penyebut 3 dengan 5 dan biarkan pembilang 2',ok:0},{t:'Bandingkan panjang tulisan kedua jawaban',ok:0}],
  [{t:'Rani benar: 10/3 kg = 3 1/3 kg; jawaban Dito tidak setara',ok:1},{t:'Dito benar karena 2 2/3 sama dengan 10/3',ok:0},{t:'Keduanya benar karena hasilnya lebih dari 2 kg',ok:0}],
  [{t:'10/3 = 3 1/3, sedangkan 2 2/3 = 8/3; nilainya berbeda',ok:1},{t:'Keduanya sama karena pembilangnya sama-sama 2 atau 10',ok:0},{t:'Tidak bisa diperiksa tanpa timbangan',ok:0}]
 ]}
];
const HOTS2 = [
 { t:'HOTS C4 • Empat kelompok mencatat hasil pengumpulan sampah daur ulang: 3/4 kg, 0,8 kg, 7/10 kg, dan 0,6 kg. Kelompok ingin menentukan dua hasil tertinggi. Analisis urutan yang tepat.', lvl:'sulit', hots:[
  [{t:'Membandingkan semua nilai dan memilih dua nilai terbesar',ok:1},{t:'Memilih dua bilangan dengan angka paling banyak',ok:0},{t:'Menjumlahkan seluruh nilai saja',ok:0}],
  [{t:'Ubah pecahan ke desimal, lalu urutkan dari terbesar',ok:1},{t:'Bandingkan pembilang 3 dan 7 saja',ok:0},{t:'Urutkan berdasarkan bentuk pecahan dahulu',ok:0}],
  [{t:'0,8 kg lalu 3/4 kg',ok:1},{t:'7/10 kg lalu 0,6 kg',ok:0},{t:'3/4 kg lalu 0,6 kg',ok:0}],
  [{t:'0,8 = 0,80 dan 3/4 = 0,75; keduanya lebih besar dari 0,7 dan 0,6',ok:1},{t:'3/4 lebih besar dari 0,8 karena 4 lebih kecil dari 8',ok:0},{t:'0,6 paling besar karena angka 6 lebih besar dari 3',ok:0}]
 ]},
 { t:'HOTS C6 • Kamu merancang papan peringkat empat tim. Data: Tim A = 0,7; Tim B = 2/3; Tim C = 3/4; Tim D = 0,8. Pilih rancangan urutan dari nilai terendah ke tertinggi yang benar.', lvl:'sulit', hots:[
  [{t:'Menentukan urutan semua tim dari nilai paling rendah ke paling tinggi',ok:1},{t:'Memilih tim dengan nama paling awal',ok:0},{t:'Mengurutkan berdasarkan banyaknya karakter angka',ok:0}],
  [{t:'Ubah 2/3 menjadi sekitar 0,67 lalu bandingkan dengan 0,7; 0,75; dan 0,8',ok:1},{t:'Anggap 2/3 sama dengan 0,23',ok:0},{t:'Bandingkan penyebut saja',ok:0}],
  [{t:'Tim B, Tim A, Tim C, Tim D',ok:1},{t:'Tim D, Tim C, Tim A, Tim B',ok:0},{t:'Tim A, Tim B, Tim D, Tim C',ok:0}],
  [{t:'Karena 2/3 ≈ 0,67 < 0,70 < 0,75 < 0,80',ok:1},{t:'Karena 2 lebih kecil dari semua angka lain yang tertulis',ok:0},{t:'Karena bilangan desimal selalu lebih besar daripada pecahan',ok:0}]
 ]}
];
M1.push(...HOTS1); M2.push(...HOTS2);
const MISS = { 1: { name: 'Dapur Numerasi Cerdas', tp: 'TP 1: perkalian & pembagian pecahan dengan bilangan asli', items: M1 }, 2: { name: 'Detektif Data Pecahan', tp: 'TP 2: membandingkan pecahan & desimal (satu angka di belakang koma)', items: M2 } };
const STAGES = ['Memahami', 'Merencanakan', 'Melaksanakan', 'Memeriksa'];
const H1 = ['Apa saja yang diketahui? Apa yang ditanyakan?', 'Strategi apa yang cocok untuk hubungan antar-bilangan ini?', 'Tulis kalimat matematikanya dulu, baru hitung langkah demi langkah.', 'Apakah hasilmu masuk akal? Coba cek dengan cara lain.'];
const H2 = {
  1: ['Temukan satu pecahan dan satu bilangan asli di cerita.', 'Kata "sama rata/setiap bagian" mengarah ke bagi; "n kali/n buah" mengarah ke kali.', 'Kali: kalikan pembilang dengan bilangan asli. Bagi: kalikan penyebut dengan bilangan asli. Sederhanakan.', 'Kali dengan bilangan asli ≥ 2 membuat hasil lebih besar; bagi membuat lebih kecil.'],
  2: ['Cari semua bilangan dan arah urutannya.', 'Ubah pecahan ke desimal (pembilang ÷ penyebut) agar mudah dibandingkan.', 'Letakkan kartu dari nilai terkecil (atau terbesar), pakai garis bilangan.', 'Bandingkan setiap dua kartu yang bersebelahan.']
};
const H3 = { mul: 'Contoh serupa: 2/3 × 3 = 6/3 = 2. Sekarang coba kembali soal utamamu.', div: 'Contoh serupa: 2/3 ÷ 2 = 2/(3×2) = 2/6 = 1/3. Sekarang coba kembali soal utamamu.', ord: 'Contoh serupa: 1/2, 0,3, 3/5 → 0,5; 0,3; 0,6 → 0,3 < 1/2 < 3/5. Sekarang coba soalmu.' };

/* ===== Penyimpanan & sinkronisasi (modul terpisah) ===== */
const LS = { get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } };
const Sync = {
  on: () => !!(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey),
  async api(path, opt = {}, token) {
    const r = await fetch(CONFIG.supabaseUrl + path, { ...opt, headers: { apikey: CONFIG.supabaseAnonKey, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token || CONFIG.supabaseAnonKey), ...(opt.headers || {}) } });
    if (!r.ok) throw new Error((await r.text()) || r.status);
    return r.status === 204 ? null : r.json().catch(() => null);
  },
  async studentToken(profile) {
    const key = 'pmq_auth_' + profileStorageKey(profile).replace('pmq_state_', '');
    let s = LS.get(key, null);
    if (!s || !s.access_token || !s.user) { const created = await this.api('/auth/v1/signup', { method: 'POST', body: '{}' }); if (!created || !created.access_token || !created.user) throw new Error('Supabase tidak memberikan sesi siswa anonim. Aktifkan Anonymous Sign-ins di Authentication.'); s = { access_token: created.access_token, refresh_token: created.refresh_token, expires_at: Date.now() + ((created.expires_in || 3600) * 1000) - 60000, user: created.user }; LS.set(key, s); }
    else if (s.expires_at && Date.now() >= s.expires_at && s.refresh_token) { const refreshed = await this.api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: s.refresh_token }) }); s = { access_token: refreshed.access_token, refresh_token: refreshed.refresh_token || s.refresh_token, expires_at: Date.now() + ((refreshed.expires_in || 3600) * 1000) - 60000, user: refreshed.user || s.user }; LS.set(key, s); }
    return s;
  },
  async post(table, rows, token) { // id/PK dikirim klien + ignore-duplicates => aman dikirim ulang
    await this.api('/rest/v1/' + table, { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(rows) }, token);
  },
  async push(batch) { // hanya sukses jika server mengonfirmasi (HTTP 2xx)
    const a = await this.studentToken(batch.profile), t = a.access_token, p = batch.profile;
    await this.post('students', [{ id: a.user.id, student_code: p.stu, class_code: p.cls }], t);
    await this.post('attempts', batch.attempts.map(r => ({ id: r.id, student_id: a.user.id, student_code: p.stu, class_code: p.cls, session_code: p.ses, mission: r.mission, item_no: r.item_no, correct: r.correct, scores: r.s, hint_total: r.hint_total, error_types: r.errors })), t);
    await this.post('polya_steps', batch.attempts.flatMap(r => r.s.map((sc, i) => ({ attempt_id: r.id, step: i + 1, score: sc, wrong_tries: r.wrong[i], hint_level: r.hints[i] }))), t);
    const hl = batch.attempts.flatMap(r => r.hints.flatMap((lv, i) => Array.from({ length: lv }, (_, k) => ({ id: crypto.randomUUID(), attempt_id: r.id, step: i + 1, level: k + 1 }))));
    if (hl.length) await this.post('hint_logs', hl, t);
    await this.post('assessments', [{ ...batch.assessment, student_id: a.user.id }], t);
  }
};

/* ===== Musik dan efek suara (Web Audio; tanpa berkas eksternal) ===== */
const AudioFX = (() => {
 let ctx=null, musicOn=false, timer=null, step=0, soundOn=true;
 const ensure=()=>{ if(!ctx) { const C=window.AudioContext||window.webkitAudioContext; if(C) ctx=new C(); } if(ctx && ctx.state==='suspended') ctx.resume(); return ctx; };
 function tone(freq=660,dur=.12,type='sine',vol=.045,delay=0,force=false){ const c=ensure(); if(!c||(!soundOn&&!force))return; const o=c.createOscillator(),g=c.createGain(); o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,c.currentTime+delay);g.gain.exponentialRampToValueAtTime(vol,c.currentTime+delay+.015);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+dur);o.connect(g);g.connect(c.destination);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+dur+.03); }
 function correct(){tone(660,.12,'sine',.05);tone(880,.18,'sine',.04,.1);}
 function wrong(){tone(220,.18,'triangle',.035);}
 function win(){[523,659,784,1047].forEach((f,i)=>tone(f,.22,'sine',.045,i*.11)); burst();}
 function burst(){ if(matchMedia('(prefers-reduced-motion: reduce)').matches)return; const el=document.createElement('div');el.className='celebrate';el.setAttribute('aria-hidden','true');el.textContent='✨ 🎉 ⭐ 🎊 ✨';document.body.appendChild(el);setTimeout(()=>el.remove(),1500); }
 function music(){ const c=ensure(); if(!c)return; musicOn=!musicOn; if(musicOn){ const notes=[523.25,659.25,783.99,659.25,587.33,698.46,880,698.46]; const play=()=>{ if(!musicOn)return; tone(notes[step++%notes.length],.26,'sine',.012,0,true); timer=setTimeout(play,360); };play(); } else {clearTimeout(timer);timer=null;} return musicOn; }
 function toggleSound(){soundOn=!soundOn;return soundOn;}
 return {correct,wrong,win,music,toggleSound,get musicOn(){return musicOn},get soundOn(){return soundOn}};
})();

/* ===== Status aplikasi ===== */
let S = LS.get('pmq_state', null) || { profile: null, items: { 1: [], 2: [] }, refl: '', synced: null };
let cur = { m: 1, i: 0 }, fb = null;
const profileStorageKey = p => 'pmq_state_' + [p.stu,p.cls,p.ses].map(x=>String(x).replace(/[^A-Za-z0-9_-]/g,'')).join('_');
const save = () => { const ok=LS.set('pmq_state', S); if(S.profile) LS.set(profileStorageKey(S.profile), S); return ok; };
const newItem = (m, i) => ({ st: 0, wrong: [0, 0, 0, 0], hint: [0, 0, 0, 0], ok: [0, 0, 0, 0], errs: [], ans: '', order: m === 2 && MISS[2].items[i].v ? MISS[2].items[i].v.map((_, k) => k) : null });
const itm = (m, i) => (S.items[m][i] = S.items[m][i] || newItem(m, i));
const status = m => { const a = MISS[m].items.map((_, i) => S.items[m][i]); return a.every(x => x && x.st === 4) ? 'selesai' : a.some(x => x && (x.st > 0 || x.wrong.some(Boolean))) ? 'sedang dikerjakan' : 'belum dimulai'; };

/* ===== UI ===== */
const h = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);
const rot = (a, k) => { k %= a.length; return a.slice(k).concat(a.slice(0, k)); };
const radios = (name, list, k) => rot(list, k).map((o, j) => `<label class="opt"><input type="radio" name="${name}" data-ok="${o.ok ? 1 : 0}"> ${h(o.t)}</label>`).join('');
const radioOk = name => { const e = document.querySelector(`input[name="${name}"]:checked`); return e ? e.dataset.ok === '1' : null; };
function banner() { const b = $('banner'); const status = Sync.on() ? 'Backend dikonfigurasi. Data dinyatakan tersimpan hanya setelah server mengonfirmasi.' : 'Mode Demo — data belum tersinkronisasi (hanya tersimpan di perangkat ini)'; b.className = Sync.on() ? 'live' : ''; b.innerHTML = `<span>${h(status)}</span> <span class="audio-controls"><button type="button" data-act="music" aria-pressed="false">♫ Musik: Mati</button> <button type="button" data-act="sound" aria-pressed="true">🔊 Efek: Aktif</button></span>`; }
function go(v) { document.querySelectorAll('[data-view]').forEach(s => (s.hidden = s.id !== v)); ({ home: viewHome, missions: viewMissions, activity: viewActivity, result: viewResult, dash: viewDash }[v] || (() => {}))(); $('main').focus(); }
function viewHome() {
  if (S.profile) { $('stu').value = S.profile.stu; $('cls').value = S.profile.cls; $('ses').value = S.profile.ses; }
  $('homeMissions').innerHTML = [1, 2].map(m => `<div class="card"><h3>Misi ${m}: ${MISS[m].name}</h3><p>${MISS[m].tp}</p><p>Status: <b>${status(m)}</b></p></div>`).join('');
}
function begin() {
  const p = { stu: $('stu').value.trim(), cls: $('cls').value.trim(), ses: $('ses').value.trim() };
  if (!validCode(p.stu) || !validCode(p.cls) || !validCode(p.ses)) { $('perr').textContent = 'Setiap kode terdiri dari 3–20 karakter: huruf, angka, strip (-) atau garis bawah (_). Jangan pakai spasi atau nama lengkap.'; return; }
  $('perr').textContent = '';
  if (!S.profile || profileStorageKey(S.profile) !== profileStorageKey(p)) { if (S.profile) save(); const prior = LS.get(profileStorageKey(p), null); S = prior || { profile: p, items: { 1: [], 2: [] }, refl: '', synced: null }; }
  S.profile = p; save(); go('missions');
}
function viewMissions() {
  if (!S.profile) { go('home'); $('perr').textContent = 'Isi kode siswa, kelas, dan sesi dulu.'; return; }
  $('missions').innerHTML = `<div class="grid2">${[1, 2].map(m => `<div class="card"><h2>Misi ${m}: ${MISS[m].name}</h2><p>${MISS[m].tp}</p><p>Status: <b>${status(m)}</b> • ${MISS[m].items.length} soal</p><div class="row"><button class="pri" data-act="open" data-m="${m}">${status(m) === 'belum dimulai' ? 'Mulai' : 'Lanjutkan'}</button><button data-act="redo" data-m="${m}">Ulangi misi</button></div></div>`).join('')}</div>
  <div class="row"><button data-act="result">Lihat hasil</button><button data-act="reset">Reset semua data di perangkat</button></div>`;
}
function openM(m) { cur = { m, i: Math.max(0, S.items[m].findIndex(x => !x || x.st < 4)) }; fb = null; go('activity'); }
function fracBar(a) { return `<div class="frac" role="img" aria-label="${a[0]} dari ${a[1]} bagian terisi">${Array.from({ length: a[1] }, (_, k) => `<i class="${k < a[0] ? 'on' : ''}"></i>`).join('')}</div>`; }
function stageUI(m, it, d, s, i) {
  if (d.hots) return `<p class="hots-label">Soal HOTS • pilih alasan terbaik pada setiap tahap.</p><p>${['1. Memahami masalah: apa yang harus dianalisis?','2. Menyusun rencana: strategi mana yang tepat?','3. Melaksanakan rencana: pilih hasil/solusi.','4. Memeriksa kembali: evaluasi alasan matematis.'][s]}</p>` + radios('rh'+s, d.hots[s], i);
  if (m === 1) {
    if (s === 0) return '<p>Pilih kalimat yang menyatakan <b>pertanyaan</b> soal ini:</p>' + radios('r0', [{ t: 'Berapa ' + (d.op === 'mul' ? 'jumlah seluruhnya' : 'bagian untuk tiap wadah/orang') + '?', ok: 1 }, { t: 'Berapa harga seluruhnya?', ok: 0 }, { t: 'Berapa lama waktu memasaknya?', ok: 0 }], i);
    if (s === 1) return '<p>Operasi apa yang tepat, dan mengapa?</p>' + radios('r1', [{ t: 'Perkalian (×)', ok: d.op === 'mul' }, { t: 'Pembagian (÷)', ok: d.op === 'div' }], i) + '<hr>' + radios('r1b', [{ t: 'Bagian yang sama digabung berulang kali', ok: d.op === 'mul' }, { t: 'Satu jumlah dibagi sama rata', ok: d.op === 'div' }], i);
    if (s === 2) return fracBar(d.a) + `<label>Tulis jawabanmu (pecahan, mis. 3/4, 1 1/2, atau bilangan bulat):<input id="ans" value="${h(it.ans)}" inputmode="text" autocomplete="off"></label>`;
    return '<p>Periksa kewajaran: bagaimana hasilmu dibanding pecahan awal?</p>' + radios('r3', [{ t: 'Hasil lebih besar dari pecahan awal', ok: d.op === 'mul' }, { t: 'Hasil lebih kecil dari pecahan awal', ok: d.op === 'div' }], i) + '<label>Refleksi singkat (opsional):<textarea id="refl" rows="2"></textarea></label>';
  }
  if (s === 0) return '<p>Apa yang diminta soal?</p>' + radios('r0', [{ t: d.dir === 'asc' ? 'Mengurutkan dari terkecil ke terbesar' : 'Mengurutkan dari terbesar ke terkecil', ok: 1 }, { t: d.dir === 'asc' ? 'Mengurutkan dari terbesar ke terkecil' : 'Mengurutkan dari terkecil ke terbesar', ok: 0 }, { t: 'Menjumlahkan semua bilangan', ok: 0 }], i);
  if (s === 1) return '<p>Strategi apa yang paling tepat?</p>' + radios('r1', [{ t: 'Ubah semua ke desimal lalu bandingkan', ok: 1 }, { t: 'Bandingkan angka pembilangnya saja', ok: 0 }, { t: 'Pilih bilangan yang tulisannya paling panjang', ok: 0 }], i);
  if (s === 2) {
    const vals = it.order.map(k => ({ t: d.v[k], f: parseNum(d.v[k]) })), mx = Math.max(...vals.map(x => x.f.n / x.f.d), 1);
    return `<p>${d.dir === 'asc' ? 'Urutkan dari TERKECIL ke TERBESAR' : 'Urutkan dari TERBESAR ke TERKECIL'}. Pakai tombol ▲ ▼ (atau seret kartu).</p><ul class="cards" id="cards">${vals.map((x, p) => `<li draggable="true" data-p="${p}"><span>${h(x.t)}</span><button data-act="mv" data-p="${p}" data-d="-1" aria-label="Naikkan ${h(x.t)}">▲</button><button data-act="mv" data-p="${p}" data-d="1" aria-label="Turunkan ${h(x.t)}">▼</button></li>`).join('')}</ul><p>Garis bilangan:</p><div class="nl" aria-hidden="true">${vals.map(x => `<b style="left:${Math.min(98, Math.max(2, x.f.n / x.f.d / mx * 96))}%">${h(x.t)}</b>`).join('')}</div>`;
  }
  return '<p>Bagaimana kamu memeriksa urutanmu?</p>' + radios('r3', [{ t: 'Saya cek setiap dua kartu yang bersebelahan', ok: 1 }, { t: 'Cukup lihat kartu pertama saja', ok: 0 }, { t: 'Tidak perlu diperiksa', ok: 0 }], i) + '<label>Refleksi singkat (opsional):<textarea id="refl" rows="2"></textarea></label>';
}
function viewActivity() {
  const { m, i } = cur, d = MISS[m].items[i], it = itm(m, i), s = it.st, total = MISS[m].items.length, done = S.items[m].filter(x => x && x.st === 4).length;
  const text = d.hots ? d.t : (m === 1 ? d.t : 'Detektif data: urutkan bilangan berikut: ' + d.v.join('; ') + '.');
  const lv = it.hint[Math.min(s, 3)];
  const hints = s < 4 && lv ? [`Tingkat 1 – Pancingan: ${H1[s]}`, lv > 1 ? `Tingkat 2 – Petunjuk strategi: ${d.hots ? ['Identifikasi data dan tujuan keputusan.','Pilih operasi/perbandingan yang sesuai.','Kerjakan perhitungan lalu bandingkan opsi.','Uji alasan dengan nilai yang setara.'][s] : H2[m][s]}` : '', lv > 2 ? `Tingkat 3 – ${d.hots ? 'Uraikan data menjadi bentuk yang mudah dibandingkan, lalu periksa setiap langkah.' : H3[m === 2 ? 'ord' : d.op]}` : ''].filter(Boolean) : [];
  $('activity').innerHTML = `<div class="card"><h2>Misi ${m} • Soal ${i + 1}/${total} <small>(${d.lvl})</small></h2><div class="bar" role="progressbar" aria-valuenow="${done}" aria-valuemax="${total}"><i style="width:${done / total * 100}%"></i></div>
  <p style="font-size:1.15rem">${h(text)}</p><div class="tabs">${STAGES.map((n, k) => `<span class="tab ${k < s ? 'done' : ''} ${k === s ? 'cur' : ''}">${k + 1}. ${n}${k < s ? ' ✓' : ''}</span>`).join('')}</div>
  <div id="stage">${s < 4 ? stageUI(m, it, d, s, i) : `<div class="fb ok">✓ Soal selesai. Skor tahap Polya: ${it.ok.map((o, k) => stageScore(o, it.wrong[k])).join(' / ')} (skala 1–4). ${it.ok[2] ? 'Jawaban benar.' : 'Jawaban belum benar — coba ulangi misi untuk memperbaiki.'}</div>`}</div>
  ${fb ? `<div class="fb ${fb.k}" role="status">${fb.k === 'ok' ? '✓ ' : fb.k === 'no' ? '✗ ' : ''}${h(fb.t)}</div>` : ''}${hints.map(x => `<div class="fb hint">💡 ${h(x)}</div>`).join('')}
  <div class="row">${s < 4 ? '<button class="pri" data-act="check">Periksa</button><button data-act="hint" ' + (lv >= 3 ? 'disabled' : '') + '>Bantuan (' + lv + '/3)</button><button data-act="skip">Lewati tahap</button>' : ''}</div>
  <div class="row"><button data-act="nav" data-d="-1" ${i === 0 ? 'disabled' : ''}>◀ Sebelumnya</button><button data-act="nav" data-d="1" ${i === total - 1 ? 'disabled' : ''}>Berikutnya ▶</button><button data-act="finish">Akhiri & lihat hasil</button></div></div>`;
  bindDrag();
}
function checkStage() {
  const { m, i } = cur, d = MISS[m].items[i], it = itm(m, i), s = it.st; let ok = false, msg = '', err = '';
  const rr = n => radioOk(n);
  if (d.hots) {
    const v = radioOk('rh'+s); if (v === null) { fb = { k: 'no', t: 'Pilih jawaban sebelum memeriksa.' }; return viewActivity(); }
    ok = v; if (!ok) { err = s === 2 ? 'penalaran' : 'strategi'; msg = 'Belum tepat. Periksa data, alasan, dan hubungan antarbilangan. Gunakan bantuan jika diperlukan.'; }
  } else if (s === 2) {
    if (m === 1) {
      it.ans = $('ans').value; const p = parseNum(it.ans);
      if (!p) { fb = { k: 'no', t: 'Format belum sesuai. Tulis pecahan seperti 3/4, campuran seperti 1 1/2, atau bilangan bulat.' }; return viewActivity(); }
      ok = eq(p, expected(d)); if (!ok) { err = classifyM1(d, p); msg = err === 'konsep' ? 'Hasilmu cocok dengan operasi kebalikan. Baca lagi: gabung berulang atau bagi sama rata?' : 'Operasinya sudah mengarah benar, tetapi hitung ulang pembilang dan penyebutnya.'; }
    } else { const n = misplaced(it.order.map(k => parseNum(d.v[k])), d.dir); ok = n === 0; if (!ok) { err = n === 4 || n === d.v.length ? 'konsep' : 'prosedur'; msg = `Masih ada ${n} kartu yang belum tepat. Ubah ke desimal dulu, lalu bandingkan dua kartu bersebelahan.`; } }
  } else {
    const names = s === 1 && m === 1 ? ['r1', 'r1b'] : [['r0', 'r1', null, 'r3'][s]], v = names.map(rr);
    if (v.includes(null)) { fb = { k: 'no', t: 'Pilih jawaban dulu sebelum memeriksa.' }; return viewActivity(); }
    ok = v.every(Boolean); if (!ok) { err = s === 3 ? 'penjelasan' : 'konsep'; msg = 'Belum tepat. Baca ulang soal; kamu boleh minta bantuan tanpa mengurangi nilai materi.'; }
  }
  if (s === 3) { const r = $('refl'); if (r && r.value) S.refl = r.value.slice(0, 300); }
  if (ok) { it.ok[s] = 1; it.st++; fb = { k: 'ok', t: 'Tepat! Lanjut ke tahap berikutnya.' }; AudioFX.correct(); if (it.st === 4) AudioFX.win(); } else { it.wrong[s]++; it.errs.push(err); fb = { k: 'no', t: msg + (it.wrong[s] >= 2 ? ' Sudah dua kali mencoba — coba tombol Bantuan.' : '') }; AudioFX.wrong(); }
  save(); viewActivity();
}
const hintBtn = () => { const it = itm(cur.m, cur.i); if (it.st < 4 && it.hint[it.st] < 3) it.hint[it.st]++; fb = null; save(); viewActivity(); };
const skipStage = () => { const it = itm(cur.m, cur.i); if (it.st < 4) { it.st++; fb = { k: 'hint', t: 'Tahap dilewati (tercatat belum tuntas).' }; } save(); viewActivity(); };
function move(p, dl) { const it = itm(cur.m, cur.i), q = p + dl; if (q < 0 || q >= it.order.length) return; [it.order[p], it.order[q]] = [it.order[q], it.order[p]]; fb = null; save(); viewActivity(); const b = document.querySelector(`[data-act="mv"][data-p="${q}"][data-d="${dl}"]`); if (b) b.focus(); }
function bindDrag() {
  const ul = $('cards'); if (!ul) return; let from = null;
  ul.querySelectorAll('li').forEach(li => { li.ondragstart = () => (from = +li.dataset.p); li.ondragover = e => e.preventDefault(); li.ondrop = e => { e.preventDefault(); const to = +li.dataset.p, it = itm(cur.m, cur.i); if (from !== null && from !== to) { const [x] = it.order.splice(from, 1); it.order.splice(to, 0, x); save(); viewActivity(); } from = null; }; });
}

/* ===== Hasil & penilaian ===== */
function records() {
  const p = S.profile; const out = [];
  [1, 2].forEach(m => MISS[m].items.forEach((_, i) => { const it = S.items[m][i]; if (!it || !(it.st > 0 || it.wrong.some(Boolean))) return; const s = it.ok.map((o, k) => stageScore(o && it.st > k, it.wrong[k])); out.push({ id: it.rid || (it.rid = crypto.randomUUID()), student_code: p.stu, class_code: p.cls, session_code: p.ses, mission: m, item_no: i + 1, correct: !!it.ok[2], finished: it.st === 4, s, wrong: it.wrong, hints: it.hint, hint_total: it.hint.reduce((a, b) => a + b, 0), errors: it.errs, ts: new Date().toISOString() }); }));
  return out;
}
function summary(m, recs) { const r = recs.filter(x => x.mission === m), n = MISS[m].items.length, fin = r.filter(x => x.finished); return { answered: r.length, correct: r.filter(x => x.correct).length, n, mastery: Math.round(r.filter(x => x.correct).length / n * 100), process: fin.length ? Math.round(avg(fin.map(x => processScore(x.s)))) : null, hints: r.reduce((a, x) => a + x.hint_total, 0) }; }
function viewResult() {
  if (!S.profile) return go('home'); const recs = records(), sm = [1, 2].map(m => summary(m, recs));
  const stageAvg = [0, 1, 2, 3].map(k => { const f = recs.filter(x => x.finished); return f.length ? avg(f.map(x => x.s[k])) : null; });
  const low = stageAvg.reduce((b, v, k) => (v !== null && (b < 0 || v < stageAvg[b]) ? k : b), -1);
  const redo = recs.filter(x => !x.correct).map(x => `Misi ${x.mission} soal ${x.item_no}`);
  const errs = recs.flatMap(x => x.errors).reduce((o, e) => ((o[e] = (o[e] || 0) + 1), o), {});
  $('result').innerHTML = `<div class="card"><h2>Hasil belajar — ${h(S.profile.stu)}</h2><div class="grid2">${sm.map((x, k) => `<div><h3>Misi ${k + 1} (TP ${k + 1})</h3><p>Nilai penguasaan materi: <b>${x.mastery}</b> (${x.correct} benar dari ${x.n} soal; dikerjakan ${x.answered}). Soal belum dikerjakan tidak dihitung benar.</p><p>Nilai proses Polya: <b>${x.process === null ? 'belum ada soal tuntas' : x.process}</b></p><p>Bantuan dipakai: <b>${x.hints}</b> kali (indikator kemandirian, tidak masuk nilai akademik)</p></div>`).join('')}</div>
  <p>Rerata tahap Polya (1–4): ${stageAvg.map((v, k) => STAGES[k] + ' ' + (v === null ? '-' : v.toFixed(1))).join(' • ')}</p>
  <p>Jenis kesalahan: ${Object.keys(errs).length ? Object.entries(errs).map(([k, v]) => k + ' ' + v).join(', ') : 'tidak ada tercatat'}</p>
  <p>Perlu diperbaiki: ${redo.length ? redo.join(', ') : 'tidak ada'}</p>
  <p><b>Rekomendasi:</b> ${low < 0 ? 'Selesaikan minimal satu soal sampai tahap 4.' : 'Perbanyak latihan tahap "' + STAGES[low] + '"; ulangi soal yang belum benar.'}</p>
  <label>Refleksi: apa yang kamu pelajari hari ini?<textarea id="refl2" rows="3">${h(S.refl || '')}</textarea></label>
  <div class="row"><button class="pri" data-act="send">Kirim hasil</button><button data-act="missions">Ulangi latihan</button><button data-act="go" data-v="home">Kembali ke beranda</button></div><p id="sendmsg" role="status"></p></div>`;
}
async function send() {
  const r2 = $('refl2'); if (r2) { S.refl = r2.value.slice(0, 300); save(); } const recs = records(), msg = $('sendmsg');
  if (!recs.length) { msg.textContent = 'Belum ada soal yang dikerjakan.'; return; }
  const q = LS.get('pmq_attempts', []); recs.forEach(r => { const k = q.findIndex(x => x.id === r.id); k < 0 ? q.push(r) : (q[k] = r); }); LS.set('pmq_attempts', q);
  if (!Sync.on()) { msg.textContent = 'Mode Demo — data hanya tersimpan di perangkat ini, belum tersinkronisasi ke server.'; return; }
  const sm = summary(1, recs); msg.textContent = 'Mengirim…';
  try {
    for (const m of [1, 2]) { const x = summary(m, recs), rr = recs.filter(a => a.mission === m); if (rr.length) await Sync.push({ profile: S.profile, attempts: rr, assessment: { id: (S['aid' + m] = S['aid' + m] || crypto.randomUUID()), session_code: S.profile.ses, mission: m, mastery: x.mastery, process: x.process || 0, hint_total: x.hints } }); }
    S.synced = new Date().toISOString(); save(); msg.textContent = 'Server mengonfirmasi penyimpanan: ' + S.synced;
  } catch (e) { msg.textContent = 'Gagal tersimpan di server (data aman di perangkat, tekan Kirim hasil untuk mencoba lagi). Rincian: ' + String(e.message).slice(0, 120); }
}

/* ===== Dashboard guru ===== */
let dashRows = null, dashLabel = '';
const demoRows = () => Array.from({ length: 12 }, (_, k) => ({ id: 'demo' + k, student_code: 'DEMO-' + (1 + k % 4), class_code: 'DEMO-KELAS', session_code: 'DEMO', mission: 1 + k % 2, item_no: 1 + k % 8, correct: k % 3 !== 0, s: [4, 3, k % 3 ? 4 : 2, 3], hints: [0, 1, 0, 0], hint_total: 1, errors: k % 3 ? [] : ['konsep'], ts: new Date().toISOString() }));
function viewDash() {
  $('dash').innerHTML = `<div class="card"><h2>Dashboard Guru</h2><p id="dstat" role="status">${Sync.on() ? 'Backend dikonfigurasi. Login guru untuk melihat data kelas Anda (dibatasi RLS).' : 'Mode Demo — login guru dinonaktifkan karena Supabase belum dikonfigurasi. Data di bawah adalah data lokal perangkat ini.'}</p>
  ${Sync.on() ? '<div class="grid3"><label>Email guru<input id="gm" type="email"></label><label>Kata sandi<input id="gp" type="password"></label></div><button class="pri" data-act="login">Masuk</button>' : '<button data-act="demo">Muat data contoh (berlabel DEMO)</button>'}
  <div class="grid3"><label>Misi<select id="fm"><option value="">Semua</option><option>1</option><option>2</option></select></label><label>Kelas<input id="fc"></label><label>Siswa<input id="fs"></label><label>Dari tanggal<input id="fd" type="date"></label></div>
  <div class="row"><button data-act="filter">Terapkan filter</button><button data-act="csv">Ekspor CSV</button></div><div id="dout"></div></div>`; drawDash();
}
function drawDash() {
  const all = dashRows || LS.get('pmq_attempts', []), m = $('fm') ? $('fm').value : '', c = $('fc') ? $('fc').value.trim() : '', s = $('fs') ? $('fs').value.trim() : '', d = $('fd') ? $('fd').value : '';
  const r = all.filter(x => (!m || x.mission == m) && (!c || x.class_code === c) && (!s || x.student_code === s) && (!d || x.ts.slice(0, 10) >= d)); window._dr = r;
  const rowsOf = k => r.filter(x => x.mission === k), pct = k => (rowsOf(k).length ? Math.round(rowsOf(k).filter(x => x.correct).length / rowsOf(k).length * 100) + '%' : '-');
  const st = k => (r.length ? avg(r.map(x => x.s[k])).toFixed(2) : '-'), errs = r.flatMap(x => x.errors).reduce((o, e) => ((o[e] = (o[e] || 0) + 1), o), {});
  const grouped = Object.values(r.reduce((o,x)=>{const k=[x.student_code,x.class_code,x.session_code].join('|');if(!o[k])o[k]={student_code:x.student_code,class_code:x.class_code,session_code:x.session_code,rows:[],last:x.ts};o[k].rows.push(x);if(x.ts>o[k].last)o[k].last=x.ts;return o;},{})).sort((a,b)=>a.student_code.localeCompare(b.student_code));
  $('dout').innerHTML = `<p>${dashLabel || (all.length && String(all[0].student_code).startsWith('DEMO') ? 'DATA DEMO' : 'Data lokal perangkat')} • ${new Set(r.map(x => x.student_code)).size} siswa • ${r.length} soal dikerjakan • tuntas ${r.filter(x => x.finished !== false).length}</p>
  <h3>Ringkasan kelas</h3><div class="scroll"><table><tr><th>TP 1 benar</th><th>TP 2 benar</th><th>Polya 1</th><th>Polya 2</th><th>Polya 3</th><th>Polya 4</th><th>Total bantuan</th><th>Kesalahan</th></tr><tr><td>${pct(1)}</td><td>${pct(2)}</td><td>${st(0)}</td><td>${st(1)}</td><td>${st(2)}</td><td>${st(3)}</td><td>${r.reduce((a, x) => a + x.hint_total, 0)}</td><td>${Object.entries(errs).map(([k, v]) => k + ':' + v).join(', ') || '-'}</td></tr></table></div>
  <h3>Hasil per siswa</h3><p>Gunakan tombol Ekspor CSV untuk analisis lanjutan.</p><div class="scroll"><table><thead><tr><th>Kode siswa</th><th>Kelas</th><th>Sesi</th><th>Soal</th><th>Benar</th><th>Nilai materi</th><th>Rerata Polya</th><th>Bantuan</th><th>Terakhir aktif</th></tr></thead><tbody>${grouped.map(g=>{const correct=g.rows.filter(x=>x.correct).length;const ps=g.rows.filter(x=>x.finished!==false).map(x=>processScore(x.s||[1,1,1,1]));return `<tr><td>${h(g.student_code)}</td><td>${h(g.class_code)}</td><td>${h(g.session_code)}</td><td>${g.rows.length}</td><td>${correct}</td><td>${Math.round(correct/Math.max(1,g.rows.length)*100)}%</td><td>${ps.length?Math.round(avg(ps))+'%':'-'}</td><td>${g.rows.reduce((a,x)=>a+(x.hint_total||0),0)}</td><td>${h(String(g.last).slice(0,19).replace('T',' '))}</td></tr>`}).join('')||'<tr><td colspan="9">Belum ada data yang cocok dengan filter.</td></tr>'}</tbody></table></div>`;
}
async function login() {
  const st = $('dstat');
  try { const a = await Sync.api('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: $('gm').value, password: $('gp').value }) }); const rows = await Sync.api('/rest/v1/attempts?select=*&order=created_at.desc&limit=2000', {}, a.access_token); dashRows = rows.map(x => ({ id: x.id, student_code: x.student_code || x.student_id.slice(0, 8), class_code: x.class_code, session_code: x.session_code, mission: x.mission, item_no: x.item_no, correct: x.correct, finished: true, s: x.scores, hints: [], hint_total: x.hint_total, errors: x.error_types || [], ts: x.created_at })); dashLabel = 'Data server (sesuai hak akses RLS)'; st.textContent = 'Terhubung ke server: ' + rows.length + ' rekaman.'; drawDash(); } catch (e) { st.textContent = 'Login/ambil data gagal: periksa email, kata sandi, dan konfigurasi. ' + String(e.message).slice(0, 100); }
}
function exportCSV() {
  const rows = window._dr || [], cols = ['student_code', 'class_code', 'session_code', 'mission', 'item_no', 'correct', 's', 'hint_total', 'errors', 'ts'];
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toCSV(rows, cols)], { type: 'text/csv;charset=utf-8' })); a.download = 'polya-math-quest.csv'; a.click();
}

/* ===== Pengendali event ===== */
function init() {
  banner(); viewHome();
  document.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return; const a = b.dataset.act, D = b.dataset;
    ({
      go: () => go(D.v), begin, open: () => openM(+D.m), check: checkStage, hint: hintBtn, skip: skipStage, mv: () => move(+D.p, +D.d), send, login, csv: exportCSV, filter: drawDash, music: () => { const on=AudioFX.music(); const b=document.querySelector('[data-act=music]'); if(b){b.textContent='♫ Musik: '+(on?'Nyala':'Mati');b.setAttribute('aria-pressed',String(on));} }, sound: () => { const on=AudioFX.toggleSound(); const b=document.querySelector('[data-act=sound]'); if(b){b.textContent=(on?'🔊 Efek: Aktif':'🔇 Efek: Mati');b.setAttribute('aria-pressed',String(on));} },
      nav: () => { cur.i += +D.d; fb = null; viewActivity(); }, result: () => go('result'),
      finish: () => { if (confirm('Akhiri aktivitas dan lihat hasil?')) go('result'); },
      redo: () => { if (confirm('Ulangi misi ini? Jawaban misi ini di perangkat akan dihapus.')) { S.items[D.m] = []; save(); go('missions'); } },
      reset: () => { if (confirm('Hapus SEMUA data di perangkat ini?')) { localStorage.removeItem('pmq_state'); localStorage.removeItem('pmq_attempts'); S = { profile: null, items: { 1: [], 2: [] }, refl: '', synced: null }; go('home'); } },
      missions: () => go('missions'), demo: () => { dashRows = demoRows(); dashLabel = 'DATA DEMO (bukan data siswa nyata)'; drawDash(); }
    }[a] || (() => {}))();
  });
}
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
if (typeof module !== 'undefined') module.exports = { F, mul, div, cmp, eq, fmt, parseNum, stageScore, processScore, validCode, misplaced, expected, classifyM1, toCSV, csvCell, M1, M2, HOTS1, HOTS2 };
