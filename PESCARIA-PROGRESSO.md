# 🎣 Pescaria: o que já está feito

**Projeto:** Phaser 3 + Vite + TypeScript, com o visual todo em pixel art gerado no código (sem imagens externas).
**Jogar online (GitHub Pages):** https://alexf-9.github.io/Fishing-Game/ (atualiza sozinho a cada push para o `main`)
**Código:** https://github.com/AlexF-9/Fishing-Game
**Página publicada no Claude (privada):** https://claude.ai/artifact/AVJ5amx4JW1zEhXVWYCjcv
**Versão antiga:** `pescaria.html` (um único ficheiro em Canvas), guardada como referência.

---

## ▶️ Como correr

| Comando | Para quê |
|---|---|
| `npm install` | Instalar as dependências (só na primeira vez) |
| `npm run dev` | Jogar em http://localhost:5173 |
| `npm run build` | Gerar `dist/index.html`, um ficheiro único que funciona sozinho |
| `npm run artifact` | Gerar `dist/artifact.html`, a versão para atualizar a página publicada |
| `playwright-cli open http://localhost:5173` e depois `playwright-cli run-code --filename=tests/playtest.js` | Correr os 45 testes automáticos |

---

## 🗂️ Organização do código (`src/`)

| Pasta | O que tem |
|---|---|
| `data/` | Peixes, raridades, animais e upgrades (dados fixos) |
| `state/` | Gravação (`save.ts`), fórmulas e sorteio do peixe, eventos |
| `systems/` | `FishingController` (as regras do ciclo de pesca, sem Phaser) e `DayNight` (céu, água, sol, lua) |
| `audio/` | Sons gerados no código |
| `art/` | O gerador de pixel art: `pixel.ts` (base), `animals.ts`, `fish.ts`, `scenery.ts`, `font.ts` e `registerAll.ts` |
| `scenes/` | `BootScene` (gera as texturas), `GameScene` (o mundo) e `UIScene` (barra de força, `!`, minijogo, textos) |
| `ui/` | HUD, loja, livro, cartão do peixe e escolha de animal, em HTML/CSS por cima do jogo |

O jogo corre a 480×300 e é ampliado no ecrã (`pixelArt` e `roundPixels` ligados), por isso tudo partilha a mesma grelha de píxeis.

---

## ✅ Concluído

### Mecânicas (iguais às da versão original)
- **4 animais com talentos.** Podes trocar a qualquer momento sem perder o progresso.

  | Animal | Talento |
  |---|---|
  | 🐱 Gato | Zona verde 15% maior |
  | 🐻 Urso | Peixes valem +25% de moedas |
  | 🐧 Pinguim | Peixes mordem 25% mais rápido |
  | 🦦 Lontra | Mais sorte com peixes raros |

- **Ciclo de pesca.**
  1. **Lançar:** barra de força, com a pré-visualização de onde o anzol cai.
  2. **Esperar** pela mordida.
  3. **Fisgar:** aparece um **!** e tens cerca de 1 segundo.
  4. **Puxar (minijogo):** 3 acertos na zona verde (4 nos Épicos e Lendários). Se falhares 3 vezes, o peixe foge.
  5. **Cartão do peixe**, com os selos **NOVO!** e **🏆 RECORDE**.
- **18 peixes em 5 raridades**, incluindo os noturnos 🌙.
  - **Lago (10):** Bota Velha, Peixinho Prateado, Carpa, Perca, Truta Arco-Íris, Lúcio, Peixe-Lua Noturno 🌙, Enguia Elétrica, Carpa Koi Dourada, Rei do Lago
  - **Mar Profundo (8):** Cavala, Robalo, Polvo, Peixe-Lanterna 🌙, Peixe-Espada, Tubarão-Martelo, Peixe Cristal, Lula Gigante 🌙
- **Loja com 6 upgrades:** Cana, Linha, Isco, Amuleto da Sorte, Balde e Barco. O preço sobe a cada nível, e o Barco desbloqueia o Mar Profundo.
- **Livro de Peixes:** os que faltam aparecem como silhueta "???", com a pista "Só aparece à noite".
- **Extras:**
  - Ciclo dia/noite de 4 minutos.
  - Sons gerados no código, com botão para tirar o som.
  - Botão "Recomeçar do zero", que pede confirmação.
- **Gravação no browser** com a mesma chave e formato de antes (`pescaria_save_v1`), por isso o progresso antigo continua a funcionar.

### Pixel art (novo)
- **Animais:** sprites de 40×48 com 9 frames (respirar, lançar e puxar) e a pata que segura a cana.
- **Peixes:** 18 sprites de 40×24, cada um com o seu pormenor (coroa no Rei, relâmpagos na Enguia, isco luminoso no Lanterna, facetas no Cristal…). As silhuetas são geradas a partir do mesmo desenho.
- **Lago:** colinas em dois planos, pinheiros e cais de tábuas com balde.
- **Mar:** barco à vela a balançar, ilhas ao longe e farol às riscas, que acende à noite com um feixe a varrer o mar.
- **Céu e água:**
  - Céu e água em faixas com dithering, que mudam de cor com a hora.
  - Sol com brilho, lua em crescente e estrelas a cintilar.
  - Nuvens alaranjadas ao pôr do sol.
  - Ondas a mexer, reflexos do sol e da lua, ondulações e salpicos.
  - Peixes do fundo em silhueta, conforme a zona e a hora.
- **Texto dentro do jogo:** fonte pixel 5×7 gerada no código, com acentos, Ç e contorno.
- **Cartão do peixe:** brilho da cor da raridade, raios nos Lendários e brilhos nos Épicos e Lendários. Antes do cartão aparecer, o peixe salta da água até ao animal.

### Anzol até ao fundo e multiplicador de sorte (novo)
- Depois do salpico, a boia fica à superfície e o anzol desce com uma linha pontilhada. Desce até à profundidade que o lançamento alcança: quanto mais longe, mais fundo.
- Lá em baixo mostra a profundidade (por exemplo **13 M**) e a sorte total (por exemplo **SORTE X1,6**), com a cor da raridade a que essa sorte chega.
- A sorte total soma o Amuleto, o talento da Lontra e a profundidade. É a mesma sorte que já decidia a raridade do peixe; a regra não mudou, só passou a ver-se.
- No minijogo o anzol sobe a cada acerto.

### Banda sonora adaptativa (novo, `src/audio/`)
É gerada em tempo real com Web Audio, sem ficheiros de som, em estilo chiptune / lo-fi.
- **Ambientes:**
  - **Lago de dia:** Dó maior pentatónica, 84 BPM, com swing.
  - **Lago de noite:** Lá dórico, 66 BPM, com eco e sinos.
  - **Mar de dia:** Ré mixolídio, 92 BPM, com arpejos e caixa.
  - **Mar de noite:** Ré frígio, 60 BPM, com drone e "ping" de sonar.
- **Como é composta:** parte de um motivo de 4 notas (o "boiar" da boia) que muda a cada frase. A cada 8 compassos há um compasso só para respirar, e a cada 32 uma secção mais despida.
- **Transições:**
  - Trocar de zona muda a música no compasso seguinte.
  - O dia e a noite trocam na frase seguinte, com uma passagem suave entre os dois ambientes.
  - O som vai ficando mais abafado com o escurecer.
- **Minijogo:** junta uma camada de hi-hats, baixo pulsado e tensão que cresce com os acertos. Entra no tempo seguinte e sai ao longo de um compasso.
- **Mistura:**
  - A música fica abaixo dos efeitos e baixa durante o "!", os acertos e as capturas. O "!" fica 17 dB acima.
  - Com a Loja ou o Livro abertos, a música fica abafada.
- **Botões:** 🔊 silencia tudo e 🎵 só a música. A música começa no primeiro clique ou tecla.
- **Testes e amostras:** `tests/music-test.js` tem 18 testes. As amostras de 10 s de cada ambiente estão em `tests/audio/`.

### Testes (playwright-cli, `tests/playtest.js`)
**49/49 a passar**, a jogar em tempo real com o teclado. Passaram tanto no `npm run dev` como no build final. Cobrem:
- escolha de animal;
- o ciclo completo de pesca, com os selos NOVO e RECORDE;
- carregar cedo demais, não reagir ao `!` e falhar 3 vezes no minijogo;
- balde cheio e vender;
- loja e preços, e a Cana a alargar a zona verde (talento do Gato ×1,15);
- Barco e Mar Profundo, e os peixes noturnos só à noite;
- Livro de Peixes;
- trocar de animal sem perder progresso;
- mute e gravação depois de recarregar;
- save no formato antigo;
- reset com confirmação;
- consola sem erros.

As capturas de ecrã ficam em `tests/screenshots/`.

---

## ⏳ Ideias para depois
- Animação de "corpo inteiro" no lançamento (por agora a cabeça e a cana é que se mexem).
- Controlos pensados para telemóvel (já dá para tocar no ecrã, mas o HUD ocupa duas linhas em ecrãs estreitos).
