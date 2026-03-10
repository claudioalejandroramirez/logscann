/**
 * MOTOR DE OPERAÇÃO - FLEX VELOZZ
 * Versão: 7.0 - Expectativa por marketplace + Inserção manual + Divergência por marketplace
 */

class UIController {
    constructor() {
        this.currentTab = 0;
        this.totalTabs = 4;
        this.bindSwipe();
    }

    goToTab(index) {
        if (index < 0 || index >= this.totalTabs) return;
        this.currentTab = index;
        document.querySelectorAll('.page').forEach((el, i) => el.classList.toggle('active', i === index));
        document.querySelectorAll('.tab-link').forEach((el, i) => el.classList.toggle('active', i === index));
        if (index === 3) document.getElementById('exportSummary').textContent = app.export.getSummary();
    }

    nextTab() { this.goToTab(this.currentTab + 1); }
    prevTab() { this.goToTab(this.currentTab - 1); }

    bindSwipe() {
        let touchstartX = 0, touchendX = 0;
        const container = document.getElementById('swipeContainer');
        container.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, { passive: true });
        container.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            if (touchendX < touchstartX - 60) this.nextTab();
            if (touchendX > touchstartX + 60) this.prevTab();
        }, { passive: true });
    }

    renderPhotos() {
        const grid = document.getElementById('photosGrid');
        grid.innerHTML = '';
        const photos = app.session.photos;
        photos.forEach((item, i) => {
            const src = typeof item === 'string' ? item : item.src;
            const label = typeof item === 'string' ? null : item.label;
            const slot = document.createElement('div');
            slot.className = 'photo-slot';
            slot.innerHTML = `<img src="${src}">` +
                (label ? `<span class="photo-label">${label}</span>` : '') +
                `<button class="photo-del" onclick="event.stopPropagation(); app.session.removePhoto(${i})">X</button>`;
            grid.appendChild(slot);
        });
        for (let i = photos.length; i < 8; i++) {
            const slot = document.createElement('div');
            slot.className = 'photo-slot' + (i === photos.length ? ' live' : '');
            slot.textContent = i === photos.length ? '+' : '○';
            if (i === photos.length) slot.onclick = () => document.getElementById('inputPhoto').click();
            grid.appendChild(slot);
        }
        document.getElementById('photoCountText').textContent = photos.length;
        document.getElementById('btnClearPhotos').classList.toggle('hidden', photos.length === 0);
    }
}

class Registry {
    constructor() { this.renderAll(); }
    renderAll() {
        this.populate('selOperator', APP_CONFIG.operadores);
        this.populate('selDriver', APP_CONFIG.entregadores);
    }
    populate(id, list) {
        const el = document.getElementById(id);
        el.innerHTML = '<option value="">Selecionar...</option>';
        list.sort().forEach(item => el.innerHTML += `<option value="${item}">${item}</option>`);
    }
}

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
        this.checkCrash();
    }

    saveBackup() {
        const backup = {
            operator: this.operator, driver: this.driver, selfie: this.selfie,
            photos: this.photos, start: this.startTime, expected: this.expected
        };
        try { 
            localStorage.setItem('velozz_active_session', JSON.stringify(backup)); 
        } catch (e) { console.warn("Limite de armazenamento local atingido."); }
    }

    checkCrash() {
        if (localStorage.getItem('velozz_active_session')) document.getElementById('btnRecover').classList.remove('hidden');
    }

    recoverCrash() {
        try {
            const backup = JSON.parse(localStorage.getItem('velozz_active_session'));
            this.operator = backup.operator; this.driver = backup.driver;
            this.selfie = backup.selfie; this.photos = backup.photos || [];
            this.startTime = backup.start || Date.now();
            this.expected = backup.expected || { ml: 0, shopee: 0, avulso: 0, total: 0 };
            this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
            this.codesMap = new Map();
            document.getElementById('selOperator').value = this.operator;
            document.getElementById('selDriver').value = this.driver;
            
            // Preenche expectativas na tela de login
            document.getElementById('inputExpML').value = this.expected.ml || '';
            document.getElementById('inputExpShopee').value = this.expected.shopee || '';
            document.getElementById('inputExpAvulso').value = this.expected.avulso || '';
            
            if (this.selfie) {
                document.getElementById('previewSelfie').src = this.selfie;
                document.getElementById('previewSelfie').style.display = 'block';
                document.getElementById('selfiePlaceholder').style.display = 'none';
            }
            document.getElementById('btnRecover').classList.add('hidden');
            this.start(true);
        } catch (e) { localStorage.removeItem('velozz_active_session'); }
    }

    start(isRecover = false) {
        this.operator = document.getElementById('selOperator').value;
        this.driver = document.getElementById('selDriver').value;
        if (!this.selfie && this.photos.length === 0) return alert("A Selfie é obrigatória!");
        if (!this.operator || !this.driver) return alert("Selecione Operador e Entregador!");
        
        // Lê expectativas por marketplace
        const expML = parseInt(document.getElementById('inputExpML').value) || 0;
        const expShopee = parseInt(document.getElementById('inputExpShopee').value) || 0;
        const expAvulso = parseInt(document.getElementById('inputExpAvulso').value) || 0;
        const expTotal = expML + expShopee + expAvulso;
        
        if (expTotal <= 0) return alert("Preencha a expectativa de pelo menos um marketplace!");
        
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
        if (isCancel && !confirm("Cancelar carga? Os dados serão perdidos.")) return;
        localStorage.removeItem('velozz_active_session');
        this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
        this.expected = { ml: 0, shopee: 0, avulso: 0, total: 0 };
        this.codesMap.clear(); this.photos = []; this.driver = ''; this.startTime = null;
        this._pendingManualCode = null; this._pendingManualType = null;
        document.getElementById('selDriver').value = '';
        
        // Limpa expectativas na login
        document.getElementById('inputExpML').value = '';
        document.getElementById('inputExpShopee').value = '';
        document.getElementById('inputExpAvulso').value = '';
        
        this.updateUI(); this.parent.ui.renderPhotos();
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginOverlay').classList.remove('hidden');
        this.parent.ui.goToTab(0); this.parent.scanner.stop();
    }

    // Reset silencioso (sem confirmação) — usado pelo cancelar divergência
    forceReset() {
        localStorage.removeItem('velozz_active_session');
        this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
        this.expected = { ml: 0, shopee: 0, avulso: 0, total: 0 };
        this.codesMap.clear(); this.photos = []; this.driver = ''; this.startTime = null;
        this._pendingManualCode = null; this._pendingManualType = null;
        document.getElementById('selDriver').value = '';
        document.getElementById('inputExpML').value = '';
        document.getElementById('inputExpShopee').value = '';
        document.getElementById('inputExpAvulso').value = '';
        this.updateUI(); this.parent.ui.renderPhotos();
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginOverlay').classList.remove('hidden');
        this.parent.ui.goToTab(0); this.parent.scanner.stop();
    }

    registerPackage(rawCode) {
        const code = rawCode.trim();
        if (this.codesMap.has(code)) {
            this.parent.audio.playError();
            this.parent.scanner.flash('dup');
            this.parent.scanner.showDupAlert();
            return;
        }

        let type = 'avulso', displayCode = code;
        
        if (code.startsWith('{') || code.includes('hash_code') || code.includes('shipment')) {
            type = 'ml'; 
            try { 
                const parsed = JSON.parse(code); 
                displayCode = parsed.shipment_id || parsed.shipment || parsed.order_id || parsed.tracking_number || parsed.hash_code || parsed.id; 
                if (!displayCode) displayCode = "ML_FLEX";
            } catch (e) {}
        } else if (/^BR[A-Z0-9]{10,16}$/i.test(code)) { 
            type = 'shopee'; 
        } else if (/^MLB[0-9]+$/i.test(code)) {
            type = 'ml';
        }

        this.counts[type]++; this.counts.total++;
        this.codesMap.set(code, { display: displayCode, type: type });
        this.parent.audio.playSuccess(); this.parent.scanner.flash('ok');
        this.parent.scanner.showBeepVisual(type); this.updateUI(type);
    }

    // Inserção manual — dispara câmera para evidência
    manualEntry() {
        const codeInput = document.getElementById('inputManualCode');
        const code = codeInput.value.trim();
        const type = document.getElementById('selManualType').value;
        
        if (!code) return alert("Digite o ID do pacote!");
        if (this.codesMap.has(code)) {
            this.parent.audio.playError();
            this.parent.scanner.showDupAlert();
            return alert("Código já registrado!");
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
        this.counts[type]++; this.counts.total++;
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
            if (box) { box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); }
        }

        const list = document.getElementById('historyList'); list.innerHTML = '';
        Array.from(this.codesMap.entries()).reverse().forEach(([rawCode, data]) => {
            const log = document.createElement('div'); log.className = 'hist-item';
            let color = data.type === 'ml' ? '#ffe600' : (data.type === 'shopee' ? '#ee4d2d' : '#94a3b8');
            const manualBadge = data.manual ? ' ✏️' : '';
            const safeRawCode = rawCode.replace(/'/g, "\\'").replace(/\\/g, "\\\\");
            log.innerHTML = `<div><span style="color:${color}; font-weight:bold;">[${data.type.toUpperCase()}]</span> ${data.display.toString().substring(0, 22)}${manualBadge}</div><button class="hist-del" onclick="app.session.removePackage('${safeRawCode}')">X</button>`;
            list.appendChild(log);
        });
    }

    removePackage(code) {
        const item = this.codesMap.get(code);
        if (!item) return;
        this.counts[item.type]--; this.counts.total--; this.codesMap.delete(code); this.updateUI();
    }

    clearAll() { 
        if (confirm("Apagar leituras?")) { 
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
    removePhoto(index) { this.photos.splice(index, 1); this.parent.ui.renderPhotos(); this.saveBackup(); }
    clearPhotos() { if (confirm("Apagar fotos?")) { this.photos = []; this.parent.ui.renderPhotos(); this.saveBackup(); } }
}

class Scanner {
    constructor(parent) {
        this.parent = parent;
        this.video = document.getElementById('camVideo');
        this.canvas = document.getElementById('qrCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.scanning = false;
        this.track = null;

        // Detecta suporte ao BarcodeDetector nativo (hardware-accelerated)
        this.useNative = ('BarcodeDetector' in window);
        this.detector = null;

        if (this.useNative) {
            const formats = ['qr_code', 'code_128', 'ean_13', 'code_39', 'ean_8', 'itf'];
            BarcodeDetector.getSupportedFormats().then(supported => {
                const active = formats.filter(f => supported.includes(f));
                this.detector = new BarcodeDetector({ formats: active });
                console.log('📷 Scanner: BarcodeDetector nativo ativo | Formatos:', active.join(', '));
            }).catch(() => {
                this.detector = new BarcodeDetector({ formats: ['qr_code'] });
                console.log('📷 Scanner: BarcodeDetector nativo ativo (apenas QR)');
            });
        } else {
            console.log('📷 Scanner: Usando jsQR (fallback JavaScript)');
        }
    }

    async init() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    advanced: [{ focusMode: "continuous" }]
                }
            });
            this.video.srcObject = stream;
            this.track = stream.getVideoTracks()[0];
            this.scanning = true;
            this.scan();
        } catch (e) { alert("Câmera bloqueada."); }
    }

    stop() { this.scanning = false; if (this.track) this.track.stop(); }

    async toggleFlashlight() {
        if (!this.track) return;
        try {
            const cap = this.track.getCapabilities(); if (!cap.torch) return alert("Lanterna indisponível.");
            this.torchOn = !this.torchOn; await this.track.applyConstraints({ advanced: [{ torch: this.torchOn }] });
            document.getElementById('btnFlash').style.background = this.torchOn ? '#ffe600' : 'rgba(0,0,0,0.6)';
        } catch (e) {}
    }

    flash(type) { const el = document.getElementById('scanFlash'); el.className = 'scan-flash'; void el.offsetWidth; el.className = 'scan-flash ' + type; }
    showBeepVisual(type) { const el = document.getElementById('beepEl'); el.className = 'beep-ind beep-' + type; el.textContent = type === 'ml' ? '🟡' : (type === 'shopee' ? '🔴' : '⚪'); void el.offsetWidth; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 500); }

    showDupAlert() {
        const container = document.getElementById('camContainer');
        // Remove alerta anterior se existir
        const existing = container.querySelector('.dup-alert');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = 'dup-alert';
        el.textContent = 'DUPLICADO';
        container.appendChild(el);
        setTimeout(() => el.remove(), 500);
    }

    async scan() {
        if (!this.scanning) return;

        if (this.parent.ui.currentTab === 0 && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            let detected = null;

            if (this.useNative && this.detector) {
                try {
                    const barcodes = await this.detector.detect(this.video);
                    if (barcodes.length > 0) {
                        detected = barcodes[0].rawValue;
                    }
                } catch (e) {}
            }

            if (!detected && typeof jsQR !== 'undefined') {
                this.canvas.height = this.video.videoHeight;
                this.canvas.width = this.video.videoWidth;
                this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
                if (code && code.data) detected = code.data;
            }

            if (detected) {
                this.parent.session.registerPackage(detected);
                setTimeout(() => requestAnimationFrame(() => this.scan()), 1500);
                return;
            }
        }

        requestAnimationFrame(() => this.scan());
    }
}

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

class AudioController {
    constructor() { this.ctx = null; this.unlocked = false; }
    init() {
        if (this.unlocked) return; const AC = window.AudioContext || window.webkitAudioContext;
        if (!this.ctx && AC) this.ctx = new AC();
        if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); osc.connect(gain); gain.connect(this.ctx.destination); gain.gain.value = 0; osc.start(this.ctx.currentTime); osc.stop(this.ctx.currentTime + 0.1); this.unlocked = true; }
    }
    playSuccess() { if (this.ctx) { this.beep(880, 0.1, 0.5); setTimeout(() => this.beep(1100, 0.1, 0.5), 100); } }
    playError() { if (this.ctx) this.beep(200, 0.4, 0.8); }
    beep(f, d, v) { if (this.ctx.state === 'suspended') this.ctx.resume(); const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); osc.connect(gain); gain.connect(this.ctx.destination); osc.frequency.value = f; gain.gain.setValueAtTime(v, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + d); osc.start(); osc.stop(this.ctx.currentTime + d); }
}

class ExportController {
    constructor(parent) {
        this.parent = parent;
        this.sheetsUrl = "https://script.google.com/macros/s/AKfycbwvB6sushmr3SJLxaaY_Gxm9FDk8_4vQm_Biui4QhUMeEZY8bFUZ6_tbKqulieMY430/exec";
        this.updateSyncUI(); window.addEventListener('online', () => this.syncQueue());
        setInterval(() => { let q = JSON.parse(localStorage.getItem('velozz_sync_queue')) || []; if (q.length > 0 && navigator.onLine) this.syncQueue(); }, 120000);
    }

    getDuration() {
        if (!app.session.startTime) return "0 min";
        const diff = Math.floor((Date.now() - app.session.startTime) / 60000);
        return diff + " min";
    }

    getSummary() {
        const s = this.parent.session;
        return `📦 SAÍDA FLEX VELOZZ\n--------------------------\nOp: ${s.operator}\nEntregador: ${s.driver}\nDuração: ${this.getDuration()}\n--------------------------\n🟡 ML: ${s.counts.ml}/${s.expected.ml}\n🔴 Shopee: ${s.counts.shopee}/${s.expected.shopee}\n⚪ Avulso: ${s.counts.avulso}/${s.expected.avulso}\n*TOTAL: ${s.counts.total}/${s.expected.total} pacotes*`;
    }

    blobToBase64(blob) { return new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(blob); }); }

    // Verifica divergência por marketplace
    checkDivergence() {
        const s = this.parent.session;
        const divergences = [];
        if (s.counts.ml !== s.expected.ml) divergences.push({ name: 'ML', color: '#ffe600', expected: s.expected.ml, read: s.counts.ml });
        if (s.counts.shopee !== s.expected.shopee) divergences.push({ name: 'Shopee', color: '#ee4d2d', expected: s.expected.shopee, read: s.counts.shopee });
        if (s.counts.avulso !== s.expected.avulso) divergences.push({ name: 'Avulso', color: '#94a3b8', expected: s.expected.avulso, read: s.counts.avulso });
        return divergences;
    }

    async toWhatsApp() {
        const s = this.parent.session;
        if (s.counts.total === 0 && s.photos.length === 0) return alert("Nada para exportar!");
        
        const divergences = this.checkDivergence();
        
        if (divergences.length > 0) {
            // Monta tabela de divergência visual
            let html = '<table style="width:100%; font-size:14px; border-collapse:collapse; margin-bottom:5px;">';
            html += '<tr style="color:#6b7280;"><th style="text-align:left; padding:4px;">Marketplace</th><th style="padding:4px;">Esperado</th><th style="padding:4px;">Lido</th></tr>';
            divergences.forEach(d => {
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
        
        const btn = document.querySelector('.btn-wa'); const oldText = btn.textContent;
        btn.textContent = '⏳ PROCESSANDO...'; btn.disabled = true;

        try {
            const blob = await this.parent.collage.build(s);
            let b64 = ""; if (blob) b64 = await this.blobToBase64(blob);

            const payload = {
                date: new Date().toLocaleDateString('pt-BR'),
                time: new Date().toLocaleTimeString('pt-BR'),
                duration: this.getDuration(),
                operator: s.operator, driver: s.driver,
                ml: s.counts.ml, shopee: s.counts.shopee, avulso: s.counts.avulso, total: s.counts.total,
                expectedML: s.expected.ml, expectedShopee: s.expected.shopee, expectedAvulso: s.expected.avulso,
                expected: s.expected.total, justification: "S/ Divergência",
                valML: s.counts.ml * 8, valShopee: s.counts.shopee * 5, valAvulso: s.counts.avulso * 8,
                valTotal: (s.counts.ml * 8) + (s.counts.shopee * 5) + (s.counts.avulso * 8),
                codes: Array.from(s.codesMap.values()).map(item => item.display).join(" | "),
                image: b64
            };

            this.sendToSheetsBackground(payload);

            if (navigator.canShare && blob) {
                const f = new File([blob], 'saida.jpg', { type: 'image/jpeg' });
                await navigator.share({ title: 'Saída Velozz', text: this.getSummary().replace(/📦/g, '*📦*'), files: [f] });
                s.forceReset();
            } else {
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(this.getSummary())}`);
                s.forceReset();
            }
        } catch (e) { s.forceReset(); } finally { btn.textContent = oldText; btn.disabled = false; }
    }

    async sendToSheetsBackground(p) { if (!navigator.onLine) return this.saveToQueue(p); try { await fetch(this.sheetsUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(p) }); } catch (e) { this.saveToQueue(p); } }
    saveToQueue(p) { let q = JSON.parse(localStorage.getItem('velozz_sync_queue')) || []; q.push(p); localStorage.setItem('velozz_sync_queue', JSON.stringify(q)); this.updateSyncUI(); }
    async syncQueue() {
        let q = JSON.parse(localStorage.getItem('velozz_sync_queue')) || []; if (!q.length || !navigator.onLine) return;
        const btn = document.getElementById('btnSync'); btn.textContent = "⏳ SINCRONIZANDO..."; let ok = [];
        for (let i = 0; i < q.length; i++) { try { await fetch(this.sheetsUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(q[i]) }); ok.push(i); } catch (e) {} }
        if (ok.length) { q = q.filter((_, idx) => !ok.includes(idx)); localStorage.setItem('velozz_sync_queue', JSON.stringify(q)); alert(`✅ Sincronizado com a planilha!`); }
        this.updateSyncUI();
    }
    updateSyncUI() { let q = JSON.parse(localStorage.getItem('velozz_sync_queue')) || []; const b = document.getElementById('btnSync'); if (q.length) { b.classList.remove('hidden'); b.textContent = `🔄 FALTAM ${q.length} (TOQUE AQUI)`; } else b.classList.add('hidden'); }
}

const app = { ui: new UIController(), registry: new Registry(), session: null, scanner: null, collage: new CollageBuilder(), audio: new AudioController(), export: null };
app.session = new Session(app); app.scanner = new Scanner(app); app.export = new ExportController(app);

// COMPRESSOR DE IMAGENS
const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            const maxW = 1200; 
            if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.85)); 
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

document.getElementById('inputSelfie').onchange = e => {
    if (!e.target.files.length) return;
    compressImage(e.target.files[0], b64 => {
        app.session.selfie = b64; 
        document.getElementById('previewSelfie').src = b64; 
        document.getElementById('previewSelfie').style.display = 'block'; 
        document.getElementById('selfiePlaceholder').style.display = 'none'; 
        app.session.saveBackup(); 
    });
};

document.getElementById('inputPhoto').onchange = e => {
    Array.from(e.target.files).forEach(f => {
        compressImage(f, b64 => app.session.addPhoto(b64));
    });
};

// Handler para foto de evidência manual
document.getElementById('inputManualPhoto').onchange = e => {
    if (!e.target.files.length) {
        // Se o usuário cancelou a câmera, cancela a inserção manual
        app.session._pendingManualCode = null;
        app.session._pendingManualType = null;
        return;
    }
    compressImage(e.target.files[0], b64 => {
        app.session.completeManualEntry(b64);
    });
};