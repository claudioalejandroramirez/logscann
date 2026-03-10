/**
 * ExportController - Exportação para WhatsApp, Google Sheets e divergência por marketplace
 */
class ExportController {
  constructor(parent) {
    this.parent = parent;
    this.sheetsUrl =
      'https://script.google.com/macros/s/AKfycbx-NXr74ObTb2v8iDFJ55PCyoGAlcFB8jRF8oPzL6GM0shaoGGhOM_wlffojZuJ6OwL/exec';
    this.updateSyncUI();
    window.addEventListener('online', () => this.syncQueue());
    setInterval(() => {
      let q = JSON.parse(localStorage.getItem('velozz_sync_queue')) || [];
      if (q.length > 0 && navigator.onLine) this.syncQueue();
    }, 120000);
  }

  getDuration() {
    if (!app.session.startTime) return '0 min';
    const diff = Math.floor((Date.now() - app.session.startTime) / 60000);
    return diff + ' min';
  }

  getSummary() {
    const s = this.parent.session;
    return `📦 SAÍDA FLEX VELOZZ\n--------------------------\nOp: ${s.operator}\nEntregador: ${s.driver}\nDuração: ${this.getDuration()}\n--------------------------\n🟡 ML: ${s.counts.ml}/${s.expected.ml}\n🔴 Shopee: ${s.counts.shopee}/${s.expected.shopee}\n⚪ Avulso: ${s.counts.avulso}/${s.expected.avulso}\n*TOTAL: ${s.counts.total}/${s.expected.total} pacotes*`;
  }

  blobToBase64(blob) {
    return new Promise((res) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result);
      r.readAsDataURL(blob);
    });
  }

  // Verifica divergência por marketplace
  checkDivergence() {
    const s = this.parent.session;
    const divergences = [];
    if (s.counts.ml !== s.expected.ml)
      divergences.push({
        name: 'ML',
        color: '#ffe600',
        expected: s.expected.ml,
        read: s.counts.ml,
      });
    if (s.counts.shopee !== s.expected.shopee)
      divergences.push({
        name: 'Shopee',
        color: '#ee4d2d',
        expected: s.expected.shopee,
        read: s.counts.shopee,
      });
    if (s.counts.avulso !== s.expected.avulso)
      divergences.push({
        name: 'Avulso',
        color: '#94a3b8',
        expected: s.expected.avulso,
        read: s.counts.avulso,
      });
    return divergences;
  }

  async toWhatsApp() {
    const s = this.parent.session;
    if (s.counts.total === 0 && s.photos.length === 0) return alert('Nada para exportar!');

    const divergences = this.checkDivergence();

    if (divergences.length > 0) {
      // Monta tabela de divergência visual
      let html =
        '<table style="width:100%; font-size:14px; border-collapse:collapse; margin-bottom:5px;">';
      html +=
        '<tr style="color:#6b7280;"><th style="text-align:left; padding:4px;">Marketplace</th><th style="padding:4px;">Esperado</th><th style="padding:4px;">Lido</th></tr>';
      divergences.forEach((d) => {
        html += `<tr><td style="color:${d.color}; font-weight:bold; padding:4px;">${d.name}</td><td style="text-align:center; padding:4px;">${d.expected}</td><td style="text-align:center; padding:4px; color:var(--danger); font-weight:bold;">${d.read}</td></tr>`;
      });
      html += '</table>';

      const totalLine = `<div style="text-align:center; margin-top:8px; font-weight:bold;">Total: <span style="color:var(--danger);">${s.counts.total}</span> / ${s.expected.total}</div>`;

      document.getElementById('divergenceText').innerHTML = html + totalLine;
      document.getElementById('modalDivergence').classList.remove('hidden');
      return;
    }

    // Sem divergência → segue direto
    this.confirmAndSend();
  }

  // Revisar — fecha modal e volta ao scanner
  reviewDivergence() {
    document.getElementById('modalDivergence').classList.add('hidden');
    this.parent.ui.goToTab(0);
  }

  // Cancelar — reseta tudo para o login
  cancelDivergence() {
    document.getElementById('modalDivergence').classList.add('hidden');
    this.parent.session.forceReset();
  }

  async confirmAndSend() {
    const s = this.parent.session;

    document.getElementById('modalDivergence').classList.add('hidden');

    const btn = document.querySelector('.btn-wa');
    const oldText = btn.textContent;
    btn.textContent = '⏳ PROCESSANDO...';
    btn.disabled = true;

    try {
      const blob = await this.parent.collage.build(s);
      let b64 = '';
      if (blob) b64 = await this.blobToBase64(blob);

      const payload = {
        date: new Date().toLocaleDateString('pt-BR'),
        time: new Date().toLocaleTimeString('pt-BR'),
        duration: this.getDuration(),
        operator: s.operator,
        driver: s.driver,
        ml: s.counts.ml,
        shopee: s.counts.shopee,
        avulso: s.counts.avulso,
        total: s.counts.total,
        expectedML: s.expected.ml,
        expectedShopee: s.expected.shopee,
        expectedAvulso: s.expected.avulso,
        expected: s.expected.total,
        justification: 'S/ Divergência',
        valML: s.counts.ml * 8,
        valShopee: s.counts.shopee * 5,
        valAvulso: s.counts.avulso * 8,
        valTotal: s.counts.ml * 8 + s.counts.shopee * 5 + s.counts.avulso * 8,
        codes: Array.from(s.codesMap.values())
          .map((item) => item.display)
          .join(' | '),
        image: b64,
      };

      this.sendToSheetsBackground(payload);

      if (navigator.canShare && blob) {
        const f = new File([blob], 'saida.jpg', { type: 'image/jpeg' });
        await navigator.share({
          title: 'Saída Velozz',
          text: this.getSummary().replace(/📦/g, '*📦*'),
          files: [f],
        });
        s.forceReset();
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(this.getSummary())}`);
        s.forceReset();
      }
    } catch (e) {
      s.forceReset();
    } finally {
      btn.textContent = oldText;
      btn.disabled = false;
    }
  }

  async sendToSheetsBackground(p) {
    if (!navigator.onLine) return this.saveToQueue(p);
    try {
      await fetch(this.sheetsUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(p) });
    } catch (e) {
      this.saveToQueue(p);
    }
  }
  saveToQueue(p) {
    let q = JSON.parse(localStorage.getItem('velozz_sync_queue')) || [];
    q.push(p);
    localStorage.setItem('velozz_sync_queue', JSON.stringify(q));
    this.updateSyncUI();
  }
  async syncQueue() {
    let q = JSON.parse(localStorage.getItem('velozz_sync_queue')) || [];
    if (!q.length || !navigator.onLine) return;
    const btn = document.getElementById('btnSync');
    btn.textContent = '⏳ SINCRONIZANDO...';
    let ok = [];
    for (let i = 0; i < q.length; i++) {
      try {
        await fetch(this.sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(q[i]),
        });
        ok.push(i);
      } catch (e) { }
    }
    if (ok.length) {
      q = q.filter((_, idx) => !ok.includes(idx));
      localStorage.setItem('velozz_sync_queue', JSON.stringify(q));
      alert(`✅ Sincronizado com a planilha!`);
    }
    this.updateSyncUI();
  }
  updateSyncUI() {
    let q = JSON.parse(localStorage.getItem('velozz_sync_queue')) || [];
    const b = document.getElementById('btnSync');
    if (q.length) {
      b.classList.remove('hidden');
      b.textContent = `🔄 FALTAM ${q.length} (TOQUE AQUI)`;
    } else b.classList.add('hidden');
  }
}
