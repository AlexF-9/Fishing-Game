// Teste em telemóvel (emulação tátil) — corre com:
//   playwright-cli -s=mobile open --mobile http://localhost:5173
//   playwright-cli -s=mobile run-code --filename=tests/mobile-test.js
// Verifica o HUD numa só linha, o menu ⚙️, as janelas em ecrã inteiro e uma pesca completa
// feita só com o botão de ação 🎣.
async page => {
  const results = [], errors = [];
  const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  const sleep = ms => page.waitForTimeout(ms);
  const ev = (fn, a) => page.evaluate(fn, a);
  const phase = () => ev(() => window.__pescaria.fishing.phase);
  const waitPhase = async (want, ms = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (want.includes(await phase())) return true; await sleep(20); }
    return false;
  };
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await ev(() => localStorage.setItem('pescaria_save_v1', JSON.stringify({ animal: 'urso', coins: 1234, upg: { cana: 1, linha: 1, isco: 0, sorte: 0, balde: 0, barco: 1 }, book: { carpa: { n: 1, best: 2 } }, bucket: [{ id: 'carpa', kg: 2, v: 9 }], zone: 'lago', time: 0.3, mute: true, music: true })));
  await page.reload(); await page.waitForFunction(() => window.__pescaria?.game?.scene?.isActive('UI')); await sleep(600);

  const vw = await ev(() => innerWidth);
  ok('Ecrã tátil detetado', await ev(() => matchMedia('(pointer: coarse)').matches), `largura ${vw}px`);

  // HUD numa só linha
  const hud = await ev(() => {
    const items = [...document.querySelectorAll('#hud > .pill, #hud > button')].filter(e => e.offsetParent !== null);
    // nova linha = algum elemento começa abaixo do fundo do primeiro
    const rects = items.map(e => e.getBoundingClientRect());
    const firstBottom = Math.min(...rects.map(r => r.bottom));
    const rows = rects.some(r => r.top >= firstBottom) ? 2 : 1;
    const h = document.getElementById('hud');
    return { rows, overflow: h.scrollWidth - h.clientWidth, n: items.length, pageOverflow: document.documentElement.scrollWidth - innerWidth };
  });
  ok('HUD cabe numa só linha', hud.rows === 1, `${hud.n} elementos, ${hud.rows} linha(s)`);
  ok('HUD sem scroll horizontal', hud.overflow <= 0, `excede ${hud.overflow}px`);
  ok('A página não desliza para o lado', hud.pageOverflow <= 0);
  const small = await ev(() => [...document.querySelectorAll('#hud button, #bAction')].filter(b => b.offsetParent && (b.getBoundingClientRect().height < 36)).map(b => b.id));
  ok('Botões com área de toque de pelo menos 36px', small.length === 0, small.join(','));
  await page.screenshot({ path: 'tests/screenshots/16-telemovel.png' });

  // menu ⚙️
  ok('Animal/Música/Som escondidos no menu', !(await page.isVisible('#bAnimal')) && await page.isVisible('#bMore'));
  await page.tap('#bMore');
  ok('⚙️ abre o menu', await page.isVisible('#moreMenu.open #bMusic'));
  await page.screenshot({ path: 'tests/screenshots/17-telemovel-menu.png' });
  await page.tap('#bMusic');
  ok('Música pode ser desligada pelo menu', await ev(() => window.__pescaria.save.music === false));
  await page.tap('#bMusic');
  const cv = await ev(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.x, y: r.y }; });
  await page.touchscreen.tap(cv.x + 20, cv.y + 20);
  await sleep(200);
  ok('Tocar fora fecha o menu', !(await page.isVisible('#moreMenu.open')));
  await ev(() => window.__pescaria.fishing.resetPhase());

  // janelas em ecrã inteiro
  await page.tap('#bShop');
  const shop = await ev(() => { const r = document.querySelector('#ovShop').getBoundingClientRect(); return { w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; });
  ok('Loja ocupa o ecrã inteiro', Math.abs(shop.w - shop.vw) < 2 && Math.abs(shop.h - shop.vh) < 2, `${shop.w}x${shop.h} de ${shop.vw}x${shop.vh}`);
  await page.screenshot({ path: 'tests/screenshots/18-telemovel-loja.png' });
  await page.tap('#ovShop [data-close]');
  await page.tap('#bBook');
  await sleep(200);
  await page.screenshot({ path: 'tests/screenshots/19-telemovel-livro.png' });
  await page.tap('#ovBook [data-close]');

  // pesca completa só com o botão 🎣
  const btn = await page.$('#bAction');
  const box = await btn.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  ok('Botão de ação visível e grande', box.height >= 56 && box.width >= 180, `${Math.round(box.width)}x${Math.round(box.height)}`);
  await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(700);
  ok('Segurar o botão carrega a força', (await phase()) === 'charging');
  ok('Texto do botão muda para "Larga"', (await page.textContent('#actLabel')).includes('Larga'));
  await page.screenshot({ path: 'tests/screenshots/20-telemovel-forca.png' });
  await page.mouse.up();
  ok('Largar o botão lança', await waitPhase(['casting', 'waiting'], 1000));
  ok('Aparece o "!"', await waitPhase(['bite']));
  await page.mouse.down(); await page.mouse.up();
  ok('Tocar no botão fisga', await waitPhase(['reeling'], 1000));
  for (let i = 0; i < 4000; i++) {
    const s = await ev(() => { const f = window.__pescaria.fishing, r = f.reel; return { ph: f.phase, z: r ? Math.abs(r.p - r.zc) <= r.zw * 0.3 : false }; });
    if (s.ph !== 'reeling') break;
    if (s.z) { await page.mouse.down(); await page.mouse.up(); await sleep(60); } else await sleep(4);
  }
  await sleep(900);
  ok('Peixe apanhado só com o botão tátil', await page.isVisible('#ovCatch.show'));
  await page.screenshot({ path: 'tests/screenshots/21-telemovel-cartao.png' });
  await page.tap('#bCatchOk');
  ok('Cartão fecha com "Continuar"', (await phase()) === 'idle');

  ok('Consola sem erros', errors.length === 0, errors.slice(0, 3).join(' | '));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  return `${results.length - fails}/${results.length} PASS\n` + results.join('\n');
}
