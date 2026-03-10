/**
 * CollageBuilder - Monta imagem de colagem com selfie + fotos de evidência
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

        const load = src => new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src; });

        const loaded = await Promise.allSettled(sources.map(s => load(s.src)));
        const imgs = loaded.map((r, i) => r.status === 'fulfilled' ? { img: r.value, label: sources[i].label } : null).filter(Boolean);
        if (!imgs.length) return null;

        const COLS = Math.min(imgs.length, 3), ROWS = Math.ceil(imgs.length / COLS), CELL = 480, HDR = 120, PAD = 12;
        const W = COLS * CELL + (COLS + 1) * PAD, H = HDR + ROWS * CELL + (ROWS + 1) * PAD;

        const canvas = document.getElementById('collageCanvas'); canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0d0f12'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#161a1f'; ctx.fillRect(0, 0, W, HDR); ctx.fillStyle = '#f97316'; ctx.fillRect(0, HDR - 4, W, 4);

        ctx.fillStyle = '#f97316'; ctx.font = 'bold 32px monospace'; ctx.fillText('SAÍDA FLEX VELOZZ', PAD + 10, 40);
        ctx.fillStyle = '#e8eaf0'; ctx.font = '22px monospace'; ctx.fillText(`${session.driver} | Op: ${session.operator}`, PAD + 10, 70);
        const d = new Date(); ctx.fillStyle = '#6b7280'; ctx.font = '18px monospace';
        ctx.fillText(`${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')} | Total: ${session.counts.total}`, PAD + 10, 100);

        imgs.forEach(({ img, label }, idx) => {
            const col = idx % COLS, row = Math.floor(idx / COLS), x = PAD + col * (CELL + PAD), y = HDR + PAD + row * (CELL + PAD);
            ctx.fillStyle = '#1e2430'; ctx.fillRect(x, y, CELL, CELL);
            const ratio = Math.max(CELL / img.naturalWidth, CELL / img.naturalHeight);
            const dw = img.naturalWidth * ratio, dh = img.naturalHeight * ratio, dx = x + (CELL - dw) / 2, dy = y + (CELL - dh) / 2;
            ctx.save(); ctx.beginPath(); ctx.rect(x, y, CELL, CELL); ctx.clip(); ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();

            // Label de evidência em vermelho, demais em branco
            const isEvidence = label.startsWith('Evidência:');
            ctx.fillStyle = isEvidence ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.6)';
            ctx.fillRect(x, y + CELL - 40, CELL, 40);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace';
            ctx.fillText(label.substring(0, 28), x + 12, y + CELL - 14);
        });

        return new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.95));
    }
}
