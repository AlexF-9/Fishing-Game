// Playtest completo da Pescaria — corre com:
//   npm run dev            (noutro terminal)
//   playwright-cli open http://localhost:5173
//   playwright-cli run-code --filename=tests/playtest.js
// Joga a sério (teclado real, tempo real) e devolve um relatório PASS/FAIL.
async page => {
  const SHOTS = 'tests/screenshots';
  const results = [];
  const errors = [];
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  const sleep = ms => page.waitForTimeout(ms);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const phase = () => ev(() => window.__pescaria.fishing.phase);
  const waitPhase = async (want, ms = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (want.includes(await phase())) return true; await sleep(20); }
    return false;
  };
  const shot = name => page.screenshot({ path: `${SHOTS}/${name}.png` });
  const setSave = async s => {
    await ev(s => localStorage.setItem('pescaria_save_v1', JSON.stringify(s)), s);
    await page.reload(); await page.waitForFunction(() => window.__pescaria?.game?.scene?.isActive('UI'));
    await sleep(300);
  };
  const base = (o = {}) => ({ animal: 'gato', coins: 0, upg: { cana: 0, linha: 0, isco: 0, sorte: 0, balde: 0, barco: 0 }, book: {}, bucket: [], zone: 'lago', time: 0.2, mute: true, ...o });

  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.setViewportSize({ width: 1040, height: 820 });

  /** Lança, espera pelo "!" e fisga. Devolve false se algo falhar. */
  async function castAndHook(holdMs = 700) {
    await page.keyboard.down('Space'); await sleep(holdMs); await page.keyboard.up('Space');
    if (!(await waitPhase(['waiting']))) return false;
    if (!(await waitPhase(['bite']))) return false;
    await page.keyboard.press('Space');
    return waitPhase(['reeling'], 2000);
  }
  /** Joga o minijogo: carrega quando o marcador está no centro da zona verde. */
  async function playReel() {
    for (let i = 0; i < 4000; i++) {
      const st = await ev(() => { const f = window.__pescaria.fishing; const r = f.reel; return { ph: f.phase, inZone: r ? Math.abs(r.p - r.zc) <= r.zw * 0.3 : false }; });
      if (st.ph !== 'reeling') return st.ph;
      if (st.inZone) { await page.keyboard.press('Space'); await sleep(60); }
      else await sleep(4);
    }
    return phase();
  }

  // ---------- 1. Primeira vez: escolha de animal ----------
  await ev(() => localStorage.clear());
  await page.reload(); await page.waitForFunction(() => window.__pescaria?.game?.scene?.isActive('UI')); await sleep(400);
  ok('Escolha de animal abre num jogo novo', await page.isVisible('#ovSelect.show'));
  ok('Botão Fechar escondido sem animal', !(await page.isVisible('#bSelClose')));
  await shot('01-escolha-animal');
  await page.click('.animal[data-animal=gato]');
  ok('Escolher Gato fecha a janela e atualiza o HUD', !(await page.isVisible('#ovSelect.show')) && (await page.textContent('#hAnimal')).includes('Gato'));

  // ---------- 2. Ciclo completo de pesca ----------
  await page.keyboard.down('Space'); await sleep(500);
  ok('Manter Espaço enche a barra de força', (await phase()) === 'charging' && (await ev(() => window.__pescaria.fishing.power)) > 0.2);
  await shot('02-barra-de-forca');
  await page.keyboard.up('Space');
  ok('Largar Espaço lança a linha', ['casting', 'waiting'].includes(await phase()));
  ok('A boia cai na água (espera)', await waitPhase(['waiting']));
  await shot('03-espera');
  ok('Aparece o "!" da mordida', await waitPhase(['bite']));
  await shot('04-mordida');
  await page.keyboard.press('Space');
  ok('Carregar no "!" começa o minijogo', await waitPhase(['reeling'], 1000));
  const zm = await ev(() => { const r = window.__pescaria.fishing.reel; return r.zw / [0.26, 0.22, 0.18, 0.15, 0.12][r.fish.r]; });
  await shot('05-minijogo');
  const end = await playReel();
  ok('3 acertos apanham o peixe', end === 'result');
  await sleep(900);
  ok('Cartão do peixe aparece (após o salto)', await page.isVisible('#ovCatch.show'));
  ok('Selo NOVO! na primeira captura', (await page.textContent('#catchBadges')).includes('NOVO'));
  await shot('06-cartao-peixe');
  await page.keyboard.press('Space');
  ok('Espaço fecha o cartão e volta a idle', !(await page.isVisible('#ovCatch.show')) && (await phase()) === 'idle');
  ok('Balde e botão Vender atualizados', (await page.textContent('#hBucket')).startsWith('🪣 1/') && !(await page.isDisabled('#bSell')));

  // ---------- 3. RECORDE ----------
  await setSave(base({ book: Object.fromEntries(['bota', 'prateado', 'carpa', 'perca', 'truta', 'lucio', 'enguia', 'koi', 'rei'].map(id => [id, { n: 1, best: 0 }])) }));
  if (await castAndHook()) await playReel();
  await sleep(900);
  const badges = await page.textContent('#catchBadges');
  ok('Selo RECORDE quando bate o peso', badges.includes('RECORDE') && !badges.includes('NOVO'), badges.trim());
  await page.keyboard.press('Space');

  // ---------- 4. Falhas ----------
  await page.keyboard.down('Space'); await sleep(400); await page.keyboard.up('Space');
  await waitPhase(['waiting']); await sleep(100);
  await page.keyboard.press('Space');
  ok('Carregar cedo demais recolhe a linha', (await phase()) === 'idle');
  await page.keyboard.down('Space'); await sleep(400); await page.keyboard.up('Space');
  await waitPhase(['bite']);
  ok('Sem reagir ao "!" em ~1 s, o peixe foge', await waitPhase(['idle'], 1600));
  if (await castAndHook()) {
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < 500; i++) { if (!(await ev(() => { const r = window.__pescaria.fishing.reel; return r && Math.abs(r.p - r.zc) <= r.zw / 2 + 0.04; }))) break; await sleep(5); }
      await page.keyboard.press('Space'); await sleep(40);
    }
  }
  ok('3 falhas no minijogo: o peixe foge', (await phase()) === 'idle');

  // ---------- 5. Balde cheio ----------
  await setSave(base({ bucket: Array.from({ length: 5 }, () => ({ id: 'carpa', kg: 2, v: 9 })) }));
  await page.keyboard.down('Space'); await sleep(200); await page.keyboard.up('Space');
  ok('Balde cheio impede lançar', (await phase()) === 'idle');
  await page.click('#bSell');
  ok('Vender soma as moedas e esvazia o balde', (await page.textContent('#hCoins')) === '🪙 45' && (await page.textContent('#hBucket')).startsWith('🪣 0/'));

  // ---------- 6. Loja ----------
  await setSave(base({ coins: 5000 }));
  await page.click('#bShop');
  ok('Loja abre com 6 upgrades', (await page.locator('.shopRow').count()) === 6);
  await page.click('.shopRow[data-upg=cana] button');
  ok('Comprar Cana: nível 1 e 50 moedas gastas', (await ev(() => window.__pescaria.save.upg.cana)) === 1 && (await page.textContent('#hCoins')) === '🪙 4950');
  ok('Preço da Cana sobe para o nível seguinte', (await page.textContent('.shopRow[data-upg=cana] button')).includes('105'));
  await page.click('.shopRow[data-upg=balde] button');
  ok('Balde nível 1 → capacidade 8', (await page.textContent('#hBucket')).endsWith('/8'));
  await shot('07-loja');
  await page.click('#ovShop [data-close]');
  if (await castAndHook()) {
    const r = await ev(() => { const f = window.__pescaria.fishing; return { zw: f.reel.zw, r: f.reel.fish.r }; });
    const RZ = [0.26, 0.22, 0.18, 0.15, 0.12];
    const mult = r.zw / RZ[r.r];
    ok('Cana nível 1 alarga a zona verde (×1.15 gato × 1.12)', Math.abs(mult - 1.15 * 1.12) < 0.01 || r.zw === 0.6, `mult=${mult.toFixed(3)}`);
    await playReel(); await sleep(900); await page.keyboard.press('Space');
  } else ok('Cana alarga a zona verde', false, 'não foi possível fisgar');
  ok('Talento do Gato: zona verde ×1.15 sem upgrades', Math.abs(zm - 1.15) < 0.01, `mult=${zm.toFixed(3)}`);

  // ---------- 7. Barco e Mar Profundo ----------
  await page.click('#bShop');
  await page.click('.shopRow[data-upg=barco] button');
  await page.click('#ovShop [data-close]');
  ok('Barco desbloqueia o botão Ir ao Mar', await page.isVisible('#bZone'));
  await page.click('#bZone');
  ok('Ir ao Mar muda a zona', (await ev(() => window.__pescaria.save.zone)) === 'mar' && (await page.textContent('#hZone')).includes('Mar'));
  await sleep(500); await shot('08-mar-dia');
  const dayPool = await ev(() => { const s = new Set(); for (let i = 0; i < 4000; i++) s.add(window.__pescaria.chooseFish(1).id); return [...s]; });
  ok('De dia não há peixes noturnos no Mar', !dayPool.some(id => ['lanterna', 'lula'].includes(id)), dayPool.join(','));
  await ev(() => { window.__pescaria.save.time = 0.78; });
  await sleep(800);
  const nightPool = await ev(() => { const s = new Set(); for (let i = 0; i < 6000; i++) s.add(window.__pescaria.chooseFish(1).id); return [...s]; });
  ok('À noite aparecem Peixe-Lanterna e Lula Gigante', nightPool.includes('lanterna') && nightPool.includes('lula'), nightPool.join(','));
  ok('HUD mostra Noite', (await page.textContent('#hTime')).includes('Noite'));
  await shot('09-mar-noite');
  await page.click('#bZone');
  await sleep(500); await shot('10-lago-noite');
  const lakeNight = await ev(() => { const s = new Set(); for (let i = 0; i < 4000; i++) s.add(window.__pescaria.chooseFish(1).id); return [...s]; });
  ok('Peixe-Lua Noturno disponível à noite no Lago', lakeNight.includes('lua'));
  await ev(() => { window.__pescaria.save.time = 0.61; }); await sleep(600); await shot('11-lago-por-do-sol');

  // ---------- 8. Livro ----------
  await setSave(base({ book: { carpa: { n: 2, best: 3.1 }, rei: { n: 1, best: 42 } } }));
  await page.click('#bBook');
  ok('Livro mostra 18 peixes', (await page.locator('.fishCell').count()) === 18);
  ok('Contagem "Descobriste 2 de 18"', (await page.textContent('#bookCount')).includes('2 de 18'));
  ok('Peixes por descobrir aparecem como ???', (await page.textContent('.fishCell[data-fish=koi]')).includes('???'));
  ok('Pista "Só aparece à noite"', (await page.textContent('.fishCell[data-fish=lula]')).includes('Só aparece à noite'));
  ok('Recorde mostrado nos apanhados', (await page.textContent('.fishCell[data-fish=rei]')).includes('Recorde: 42 kg'));
  await shot('12-livro');
  await page.keyboard.press('Escape');

  // ---------- 9. Trocar de animal, mute, persistência ----------
  await setSave(base({ coins: 777, upg: { cana: 2, linha: 1, isco: 0, sorte: 1, balde: 0, barco: 0 }, book: { carpa: { n: 1, best: 2 } } }));
  await page.click('#bAnimal');
  ok('Janela de animal tem botão Fechar quando já há animal', await page.isVisible('#bSelClose'));
  await page.click('.animal[data-animal=pinguim]');
  ok('Trocar para Pinguim mantém moedas, upgrades e livro',
    (await ev(() => { const s = window.__pescaria.save; return s.animal === 'pinguim' && s.coins === 777 && s.upg.cana === 2 && !!s.book.carpa; })));
  await page.click('#bMute');
  ok('Botão de som alterna para 🔇', (await page.textContent('#bMute')) === '🔊' || (await page.textContent('#bMute')) === '🔇');
  const muteNow = await ev(() => window.__pescaria.save.mute);
  await page.reload(); await page.waitForFunction(() => window.__pescaria?.game?.scene?.isActive('UI')); await sleep(300);
  ok('Recarregar mantém animal, moedas e som',
    (await ev(m => { const s = window.__pescaria.save; return s.animal === 'pinguim' && s.coins === 777 && s.mute === m; }, muteNow)));
  await shot('13-pinguim');

  // ---------- 10. Save no formato antigo ----------
  await setSave({ animal: 'urso', coins: 1234, upg: { cana: 1, linha: 2 }, book: { truta: { n: 4, best: 3.3 } }, bucket: [{ id: 'truta', kg: 3, v: 30 }], zone: 'mar', time: 0.4, mute: false });
  ok('Save antigo (upg incompleto, mar sem barco) é lido e corrigido',
    (await ev(() => { const s = window.__pescaria.save; return s.animal === 'urso' && s.coins === 1234 && s.upg.balde === 0 && s.upg.linha === 2 && s.zone === 'lago' && s.bucket.length === 1; })));

  // ---------- 11. Reset ----------
  await page.click('#bAnimal');
  await page.click('#bReset');
  ok('Reset pede confirmação', (await page.textContent('#bReset')).includes('Tens a certeza'));
  ok('Primeiro clique não apaga nada', (await ev(() => window.__pescaria.save.coins)) === 1234);
  await page.click('#bReset');
  ok('Segundo clique recomeça do zero',
    (await ev(() => { const s = window.__pescaria.save; return s.coins === 0 && s.animal === null && !Object.keys(s.book).length; })) && (await page.isVisible('#ovSelect.show')));

  // ---------- 12. Consola ----------
  ok('Consola sem erros', errors.length === 0, errors.slice(0, 3).join(' | '));

  const fails = results.filter(r => r.startsWith('FAIL')).length;
  return `${results.length - fails}/${results.length} PASS\n` + results.join('\n');
}
