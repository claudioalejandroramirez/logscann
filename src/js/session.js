/**
 * Session - Estado da conferência: pacotes, fotos, expectativas, inserção manual
 */
class Session {
  constructor(parent) {
    this.parent = parent;
    this.operator = '';
    this.driver = '';
    this.selfie = '';
    this.photos = []; // Cada item: string (b64) ou { src: b64, label: string }
    this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
    this.expected = { ml: 0, shopee: 0, avulso: 0, total: 0 };
    this.codesMap = new Map();
    this.startTime = null;
    this._pendingManualCode = null; // Para guardar código enquanto aguarda foto
    this._pendingManualType = null;
  }

  saveBackup() {
    const backup = {
      operator: this.operator,
      driver: this.driver,
      selfie: this.selfie,
      photos: this.photos,
      start: this.startTime,
      expected: this.expected,
    };
    try {
      localStorage.setItem('velozz_active_session', JSON.stringify(backup));
    } catch (e) {
      console.warn('Limite de armazenamento local atingido.');
    }
  }

  start(isRecover = false) {
    this.operator = document.getElementById('selOperator').value;
    this.driver = document.getElementById('selDriver').value;
    if (!this.selfie && this.photos.length === 0) return alert('A Selfie é obrigatória!');
    if (!this.operator || !this.driver) return alert('Selecione Operador e Entregador!');

    // Lê expectativas por marketplace
    const expML = parseInt(document.getElementById('inputExpML').value) || 0;
    const expShopee = parseInt(document.getElementById('inputExpShopee').value) || 0;
    const expAvulso = parseInt(document.getElementById('inputExpAvulso').value) || 0;
    const expTotal = expML + expShopee + expAvulso;

    if (expTotal <= 0) return alert('Preencha a expectativa de pelo menos um marketplace!');

    this.expected = { ml: expML, shopee: expShopee, avulso: expAvulso, total: expTotal };

    if (!isRecover) this.startTime = Date.now();
    this.parent.audio.init();
    this.saveBackup();

    document.getElementById('displayOperator').textContent = `Op: ${this.operator}`;
    document.getElementById('displayDriver').textContent = this.driver;
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');

    // Mostra expectativas nos stat-items
    document.getElementById('expML').textContent = `/ ${this.expected.ml}`;
    document.getElementById('expShopee').textContent = `/ ${this.expected.shopee}`;
    document.getElementById('expAvulso').textContent = `/ ${this.expected.avulso}`;

    this.parent.ui.renderPhotos();
    this.parent.scanner.init();
  }

  reset(isCancel = false) {
    if (isCancel && !confirm('Cancelar carga? Os dados serão perdidos.')) return;
    localStorage.removeItem('velozz_active_session');
    this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
    this.expected = { ml: 0, shopee: 0, avulso: 0, total: 0 };
    this.codesMap.clear();
    this.photos = [];
    this.driver = '';
    this.startTime = null;
    this._pendingManualCode = null;
    this._pendingManualType = null;
    document.getElementById('selDriver').value = '';

    // Limpa expectativas na login
    document.getElementById('inputExpML').value = '';
    document.getElementById('inputExpShopee').value = '';
    document.getElementById('inputExpAvulso').value = '';

    this.updateUI();
    this.parent.ui.renderPhotos();
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginOverlay').classList.remove('hidden');
    this.parent.ui.goToTab(0);
    this.parent.scanner.stop();
  }

  // Reset silencioso (sem confirmação) — usado pelo cancelar divergência
  forceReset() {
    localStorage.removeItem('velozz_active_session');
    this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
    this.expected = { ml: 0, shopee: 0, avulso: 0, total: 0 };
    this.codesMap.clear();
    this.photos = [];
    this.driver = '';
    this.startTime = null;
    this._pendingManualCode = null;
    this._pendingManualType = null;
    document.getElementById('selDriver').value = '';
    document.getElementById('inputExpML').value = '';
    document.getElementById('inputExpShopee').value = '';
    document.getElementById('inputExpAvulso').value = '';
    this.updateUI();
    this.parent.ui.renderPhotos();
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginOverlay').classList.remove('hidden');
    this.parent.ui.goToTab(0);
    this.parent.scanner.stop();
  }

  registerPackage(rawCode) {
    const code = rawCode.trim();
    if (this.codesMap.has(code)) {
      this.parent.audio.playError();
      this.parent.scanner.flash('dup');
      this.parent.scanner.showDupAlert();
      return;
    }

    let type = 'avulso',
      displayCode = code;

    if (code.startsWith('{') || code.includes('hash_code') || code.includes('shipment')) {
      type = 'ml';
      try {
        const parsed = JSON.parse(code);
        displayCode =
          parsed.shipment_id ||
          parsed.shipment ||
          parsed.order_id ||
          parsed.tracking_number ||
          parsed.hash_code ||
          parsed.id;
        if (!displayCode) displayCode = 'ML_FLEX';
      } catch (e) {}
    } else if (/^BR[A-Z0-9]{10,16}$/i.test(code)) {
      type = 'shopee';
    } else if (/^MLB[0-9]+$/i.test(code)) {
      type = 'ml';
    }

    this.counts[type]++;
    this.counts.total++;
    this.codesMap.set(code, { display: displayCode, type: type });
    this.parent.audio.playSuccess();
    this.parent.scanner.flash('ok');
    this.parent.scanner.showBeepVisual(type);
    this.updateUI(type);
  }

  // Inserção manual — dispara câmera para evidência
  manualEntry() {
    const codeInput = document.getElementById('inputManualCode');
    const code = codeInput.value.trim();
    const type = document.getElementById('selManualType').value;

    if (!code) return alert('Digite o ID do pacote!');
    if (this.codesMap.has(code)) {
      this.parent.audio.playError();
      this.parent.scanner.showDupAlert();
      return alert('Código já registrado!');
    }

    // Guarda o código e tipo pendente, dispara câmera para foto obrigatória
    this._pendingManualCode = code;
    this._pendingManualType = type;
    document.getElementById('inputManualPhoto').click();
  }

  // Chamado quando a foto de evidência manual é capturada
  completeManualEntry(photoB64) {
    const code = this._pendingManualCode;
    const type = this._pendingManualType;
    if (!code || !type) return;

    // Registra o pacote
    this.counts[type]++;
    this.counts.total++;
    this.codesMap.set(code, { display: code, type: type, manual: true });

    // Adiciona foto com label de evidência
    const label = `Evidência: ${code}`;
    this.addPhoto(photoB64, label);

    this.parent.audio.playSuccess();
    this.parent.scanner.showBeepVisual(type);
    this.updateUI(type);

    // Limpa campos
    document.getElementById('inputManualCode').value = '';
    this._pendingManualCode = null;
    this._pendingManualType = null;
  }

  updateUI(lastType = null) {
    document.getElementById('countML').textContent = this.counts.ml;
    document.getElementById('countShopee').textContent = this.counts.shopee;
    document.getElementById('countAvulso').textContent = this.counts.avulso;
    document.getElementById('countTotal').textContent = this.counts.total;

    if (lastType) {
      const box = document.getElementById('box-' + lastType);
      if (box) {
        box.classList.remove('bump');
        void box.offsetWidth;
        box.classList.add('bump');
      }
    }

    const list = document.getElementById('historyList');
    list.innerHTML = '';
    Array.from(this.codesMap.entries())
      .reverse()
      .forEach(([rawCode, data]) => {
        const log = document.createElement('div');
        log.className = 'hist-item';
        let color = data.type === 'ml' ? '#ffe600' : data.type === 'shopee' ? '#ee4d2d' : '#94a3b8';
        const manualBadge = data.manual ? ' ✏️' : '';
        const safeRawCode = rawCode.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
        log.innerHTML = `<div><span style="color:${color}; font-weight:bold;">[${data.type.toUpperCase()}]</span> ${data.display.toString().substring(0, 22)}${manualBadge}</div><button class="hist-del" onclick="app.session.removePackage('${safeRawCode}')">X</button>`;
        list.appendChild(log);
      });
  }

  removePackage(code) {
    const item = this.codesMap.get(code);
    if (!item) return;
    this.counts[item.type]--;
    this.counts.total--;
    this.codesMap.delete(code);
    this.updateUI();
  }

  clearAll() {
    if (confirm('Apagar leituras?')) {
      this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
      this.codesMap.clear();
      this.updateUI();
    }
  }

  addPhoto(b64, label = null) {
    if (this.photos.length < 8) {
      const item = label ? { src: b64, label: label } : b64;
      this.photos.push(item);
      this.parent.ui.renderPhotos();
      this.saveBackup();
    }
  }
  removePhoto(index) {
    this.photos.splice(index, 1);
    this.parent.ui.renderPhotos();
    this.saveBackup();
  }
  clearPhotos() {
    if (confirm('Apagar fotos?')) {
      this.photos = [];
      this.parent.ui.renderPhotos();
      this.saveBackup();
    }
  }
}
