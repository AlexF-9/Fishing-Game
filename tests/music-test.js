// Testes da banda sonora — corre com:
//   playwright-cli open http://localhost:5173
//   playwright-cli run-code --filename=tests/music-test.js
// Verifica autoplay, ambientes, transições em compasso, camada do minijogo, botões 🎵/🔊,
// mistura (música abaixo dos efeitos) e grava 4 amostras .webm em tests/audio/.
async page => {
  const results = [], errors = [];
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  const sleep = ms => page.waitForTimeout(ms);
  const ev = (fn, a) => page.evaluate(fn, a);
  const st = () => ev(() => window.__pescaria.music.state);
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await ev(() => localStorage.setItem('pescaria_save_v1', JSON.stringify({ animal: 'gato', coins: 0, upg: { cana: 0, linha: 0, isco: 0, sorte: 0, balde: 0, barco: 1 }, book: {}, bucket: [], zone: 'lago', time: 0.2, mute: false })));
  await page.reload(); await page.waitForFunction(() => window.__pescaria?.game?.scene?.isActive('UI')); await sleep(500);

  // 1. autoplay: nada antes da primeira interação
  ok('Sem AudioContext antes de interagir', (await ev(() => window.__pescaria.getBuses())) === null);
  await page.click('#bBook'); await page.keyboard.press('Escape');
  await sleep(2500);
  let s = await st();
  ok('Música arranca após o primeiro clique', s.style === 'lagoDia' && s.decks === 1, JSON.stringify(s));
  ok('Save antigo sem campo "music" fica com música ligada', await ev(() => window.__pescaria.save.music === true));

  // medidor de nível (RMS) no barramento de música e de efeitos
  await ev(() => {
    const b = window.__pescaria.getBuses();
    const mk = node => { const a = b.ac.createAnalyser(); a.fftSize = 2048; node.connect(a); return a; };
    window.__meter = { music: mk(b.musicFilter), sfx: mk(b.sfx) };
    window.__rms = async (key, ms) => {
      const a = window.__meter[key], buf = new Float32Array(a.fftSize); let peak = 0, sum = 0, n = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        a.getFloatTimeDomainData(buf);
        for (const v of buf) { sum += v * v; n++; peak = Math.max(peak, Math.abs(v)); }
        await new Promise(r => setTimeout(r, 30));
      }
      return { rms: Math.sqrt(sum / n), peak };
    };
  });
  const musicLvl = await ev(() => window.__rms('music', 3000));
  ok('A música está a soar', musicLvl.rms > 0.002, `rms=${musicLvl.rms.toFixed(4)} pico=${musicLvl.peak.toFixed(3)}`);

  // 2. mistura: o "!" (bite) fica bem acima da música
  // mede os dois barramentos ao mesmo tempo enquanto toca o som do "!" (com o ducking ativo)
  const both = await ev(async () => {
    window.__pescaria.fishing.events.emit('bite');
    // o analisador guarda ~46 ms de passado: começa a medir depois de o ducking entrar
    await new Promise(r => setTimeout(r, 70));
    const p = Promise.all([window.__rms('sfx', 250), window.__rms('music', 250)]);
    const [sfx, music] = await p; return { sfx, music };
  });
  const db = 20 * Math.log10(both.sfx.peak / Math.max(1e-4, both.music.peak));
  ok('O "!" fica pelo menos 9 dB acima da música', db >= 9, `sfx pico=${both.sfx.peak.toFixed(3)}, música pico=${both.music.peak.toFixed(3)} (${db.toFixed(1)} dB)`);
  ok('Música sozinha fica abaixo dos efeitos', musicLvl.peak < 0.066, `pico=${musicLvl.peak.toFixed(3)} (o "!" tem 0,066)`);

  // 3. troca de zona: transição em compasso com 2 decks
  await page.click('#bZone');
  await sleep(150);
  s = await st();
  ok('Ir ao Mar inicia a transição (2 decks)', s.style === 'marDia' && s.decks === 2, JSON.stringify(s));
  await sleep(7000);
  s = await st();
  ok('Depois da transição fica só o deck do Mar', s.style === 'marDia' && s.decks === 1, JSON.stringify(s));

  // 4. noite
  await ev(() => { window.__pescaria.save.time = 0.75; });
  await sleep(200);
  s = await st();
  ok('Anoitecer troca para Mar de noite', s.style === 'marNoite', JSON.stringify(s));
  await page.click('#bZone'); await sleep(200);
  ok('Lago de noite', (await st()).style === 'lagoNoite');
  await ev(() => { window.__pescaria.save.time = 0.2; }); await sleep(200);
  ok('De dia volta ao Lago de dia', (await st()).style === 'lagoDia');
  await sleep(12000);

  // 5. minijogo
  await page.keyboard.down('Space'); await sleep(600); await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__pescaria.fishing.phase === 'bite', null, { timeout: 15000 });
  await page.keyboard.press('Space'); await sleep(300);
  ok('Camada do minijogo liga ao puxar', (await st()).reel === true);
  for (let i = 0; i < 4000; i++) {
    const r = await ev(() => { const f = window.__pescaria.fishing; return { ph: f.phase, z: f.reel ? Math.abs(f.reel.p - f.reel.zc) <= f.reel.zw * 0.3 : false }; });
    if (r.ph !== 'reeling') break;
    if (r.z) { await page.keyboard.press('Space'); await sleep(60); } else await sleep(4);
  }
  await sleep(200);
  ok('Camada do minijogo desliga no fim', (await st()).reel === false);
  await sleep(900); await page.keyboard.press('Space');

  // 6. botões
  await page.click('#bMusic');
  ok('🎵 desliga só a música', await ev(() => window.__pescaria.save.music === false && !window.__pescaria.save.mute));
  await sleep(2500);
  const off = await ev(() => window.__rms('music', 800));
  ok('Música em silêncio com 🎵 desligado', off.peak < 0.002, `pico=${off.peak.toFixed(4)}`);
  await page.click('#bMusic'); await sleep(2500);
  ok('🎵 volta a ligar a música', (await st()).style !== null && (await ev(() => window.__rms('music', 1500))).rms > 0.002);
  await page.click('#bMute');
  ok('🔊 silencia tudo (master a 0)', await ev(() => window.__pescaria.save.mute && window.__pescaria.getBuses().master.gain.value < 0.05) || await (async () => { await sleep(300); return ev(() => window.__pescaria.getBuses().master.gain.value < 0.05); })());
  await page.click('#bMute');

  // 7. amostras para ouvir (10 s por ambiente)
  const record = async (style, file, secs = 10) => {
    await ev(s => { window.__pescaria.music.forced = s; }, style);
    await sleep(style === 'lagoDia' ? 500 : 9000);
    const dl = page.waitForEvent('download');
    await ev(async secs => {
      const b = window.__pescaria.getBuses();
      const dest = b.ac.createMediaStreamDestination();
      b.master.connect(dest);
      const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' });
      const chunks = [];
      rec.ondataavailable = e => chunks.push(e.data);
      const done = new Promise(r => (rec.onstop = r));
      rec.start(); await new Promise(r => setTimeout(r, secs * 1000)); rec.stop(); await done;
      b.master.disconnect(dest);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(chunks, { type: 'audio/webm' }));
      a.download = 'x.webm'; document.body.appendChild(a); a.click(); a.remove();
    }, secs);
    await (await dl).saveAs(`tests/audio/${file}`);
  };
  await record('lagoDia', '1-lago-dia.webm');
  await record('lagoNoite', '2-lago-noite.webm');
  await record('marDia', '3-mar-dia.webm');
  await record('marNoite', '4-mar-noite.webm');
  await ev(() => { window.__pescaria.music.forced = null; });

  ok('Consola sem erros', errors.length === 0, errors.slice(0, 3).join(' | '));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  return `${results.length - fails}/${results.length} PASS\n` + results.join('\n');
}
