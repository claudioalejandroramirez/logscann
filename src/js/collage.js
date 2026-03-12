/**
 * CollageBuilder - Monta imagem de colagem com selfie + fotos de evidência
 * O resumo completo da conferência é renderizado no cabeçalho da imagem.
 */
class CollageBuilder {
  async build(session) {
    const sources = [];
    if (session.selfie) sources.push({ src: session.selfie, label: '👤 ' + session.operator });
    session.photos.forEach((item, i) => {
      if (typeof item === 'string') {
        sources.push({ src: item, label: 'Foto ' + (i + 1) });
      } else {
        sources.push({ src: item.src, label: item.label || 'Foto ' + (i + 1) });
      }
    });
    if (!sources.length) return null;

    const load = (src) =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });

    const loaded = await Promise.allSettled(sources.map((s) => load(s.src)));
    const imgs = loaded
      .map((r, i) => (r.status === 'fulfilled' ? { img: r.value, label: sources[i].label } : null))
      .filter(Boolean);
    if (!imgs.length) return null;

    const d = new Date();
    const dur = session.startTime ? Math.floor((Date.now() - session.startTime) / 60000) + ' min' : '—';
    const counts = session.counts;
    const exp = session.expected;

    // Divergências por marketplace
    const divML = counts.ml !== exp.ml;
    const divShopee = counts.shopee !== exp.shopee;
    const divAvulso = counts.avulso !== exp.avulso;
    const hasDivergence = divML || divShopee || divAvulso;

    // Valores financeiros
    const valML = counts.ml * 8;
    const valShopee = counts.shopee * 5;
    const valAvulso = counts.avulso * 8;
    const valTotal = valML + valShopee + valAvulso;

    // Layout
    const COLS = Math.min(imgs.length, 3);
    const ROWS = Math.ceil(imgs.length / COLS);
    const CELL = 480;
    const PAD = 12;
    const HDR = 310; // cabeçalho expandido para caber o resumo

    const W = COLS * CELL + (COLS + 1) * PAD;
    const H = HDR + ROWS * CELL + (ROWS + 1) * PAD;

    const canvas = document.getElementById('collageCanvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Fundo geral
    ctx.fillStyle = '#0d0f12';
    ctx.fillRect(0, 0, W, H);

    // Fundo do cabeçalho
    ctx.fillStyle = '#161a1f';
    ctx.fillRect(0, 0, W, HDR);

    // Linha laranja separando header do conteúdo
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, HDR - 4, W, 4);

    // ── Título ──────────────────────────────────────────
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('SAÍDA FLEX VELOZZ', PAD + 10, 44);

    // ── Dados do operador / entregador / data ───────────
    ctx.fillStyle = '#e8eaf0';
    ctx.font = '22px monospace';
    ctx.fillText(`Entregador: ${session.driver}`, PAD + 10, 78);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '19px monospace';
    ctx.fillText(`Operador: ${session.operator}`, PAD + 10, 104);
    ctx.fillText(
      `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')}  |  Duração: ${dur}`,
      PAD + 10, 128
    );

    // ── Linha divisória interna ──────────────────────────
    ctx.strokeStyle = '#2e3440';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD + 10, 142);
    ctx.lineTo(W - PAD - 10, 142);
    ctx.stroke();

    // ── Tabela de contagens ──────────────────────────────
    const tableX = PAD + 10;
    let tableY = 168;
    const colW = Math.floor((W - PAD * 2 - 20) / 4);

    // Cabeçalho da tabela
    ctx.fillStyle = '#6b7280';
    ctx.font = 'bold 17px monospace';
    ctx.fillText('MARKETPLACE', tableX, tableY);
    ctx.fillText('LIDO', tableX + colW * 1, tableY);
    ctx.fillText('ESPERADO', tableX + colW * 2, tableY);
    ctx.fillText('VALOR', tableX + colW * 3, tableY);
    tableY += 6;

    ctx.strokeStyle = '#2e3440';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, tableY);
    ctx.lineTo(W - PAD - 10, tableY);
    ctx.stroke();
    tableY += 22;

    // Linhas de dados
    const rows = [
      { label: '🟡 ML', color: '#ffe600', lido: counts.ml, esp: exp.ml, val: valML, div: divML },
      { label: '🔴 Shopee', color: '#ee4d2d', lido: counts.shopee, esp: exp.shopee, val: valShopee, div: divShopee },
      { label: '⚪ Avulso', color: '#94a3b8', lido: counts.avulso, esp: exp.avulso, val: valAvulso, div: divAvulso },
    ];

    rows.forEach((row) => {
      ctx.fillStyle = row.color;
      ctx.font = 'bold 20px monospace';
      ctx.fillText(row.label, tableX, tableY);

      // Se divergente, lido em vermelho
      ctx.fillStyle = row.div ? '#ef4444' : '#e8eaf0';
      ctx.font = row.div ? 'bold 20px monospace' : '20px monospace';
      ctx.fillText(String(row.lido), tableX + colW * 1, tableY);

      ctx.fillStyle = '#e8eaf0';
      ctx.font = '20px monospace';
      ctx.fillText(String(row.esp), tableX + colW * 2, tableY);

      ctx.fillStyle = '#4ade80';
      ctx.fillText(`R$ ${row.val.toFixed(2)}`, tableX + colW * 3, tableY);

      tableY += 30;
    });

    // ── Total ────────────────────────────────────────────
    tableY += 4;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, tableY);
    ctx.lineTo(W - PAD - 10, tableY);
    ctx.stroke();
    tableY += 22;

    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('TOTAL', tableX, tableY);

    ctx.fillStyle = hasDivergence ? '#ef4444' : '#e8eaf0';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${counts.total} / ${exp.total}`, tableX + colW * 1, tableY);

    ctx.fillStyle = '#4ade80';
    ctx.fillText(`R$ ${valTotal.toFixed(2)}`, tableX + colW * 3, tableY);

    // Badge de divergência (se houver)
    if (hasDivergence) {
      const badgeX = W - 200;
      const badgeY = tableY - 20;
      ctx.fillStyle = 'rgba(239,68,68,0.15)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, 185, 30, 6);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('⚠ COM DIVERGÊNCIA', badgeX + 10, badgeY + 20);
    }

    // ── Fotos ─────────────────────────────────────────────
    imgs.forEach(({ img, label }, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = PAD + col * (CELL + PAD);
      const y = HDR + PAD + row * (CELL + PAD);

      ctx.fillStyle = '#1e2430';
      ctx.fillRect(x, y, CELL, CELL);

      const ratio = Math.max(CELL / img.naturalWidth, CELL / img.naturalHeight);
      const dw = img.naturalWidth * ratio;
      const dh = img.naturalHeight * ratio;
      const dx = x + (CELL - dw) / 2;
      const dy = y + (CELL - dh) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, CELL, CELL);
      ctx.clip();
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      // Label da foto
      const isEvidence = label.startsWith('Evidência:');
      ctx.fillStyle = isEvidence ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.65)';
      ctx.fillRect(x, y + CELL - 40, CELL, 40);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(label.substring(0, 28), x + 12, y + CELL - 14);
    });

    return new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.95));
  }
}