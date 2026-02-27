/**
 * MOTOR DE OPERAÇÃO - FLEX VELOZZ
 * Versão: 5.0 - Beep alto, WA hardcoded, Sheets corrigido, compressão de imagem
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

        document.querySelectorAll('.page').forEach((el, i) => {
            el.classList.toggle('active', i === index);
        });
        document.querySelectorAll('.tab-link').forEach((el, i) => {
            el.classList.toggle('active', i === index);
        });

        if (index === 3) {
            document.getElementById('exportSummary').textContent = app.export.getSummary();
        }
    }

    nextTab() { this.goToTab(this.currentTab + 1); }
    prevTab()  { this.goToTab(this.currentTab - 1); }

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
        const grid   = document.getElementById('photosGrid');
        grid.innerHTML = '';
        const photos = app.session.photos;

        photos.forEach((src, i) => {
            const slot = document.createElement('div');
            slot.className = 'photo-slot';
            slot.innerHTML = `<img src="${src}"><button class="photo-del" onclick="event.stopPropagation(); app.session.removePhoto(${i})">X</button>`;
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
        this.populate('selDriver',   APP_CONFIG.entregadores);
    }

    populate(id, list) {
        const el = document.getElementById(id);
        el.innerHTML = '<option value="">Selecionar...</option>';
        [...list].sort().forEach(item => {
            el.innerHTML += `<option value="${item}">${item}</option>`;
        });
    }
}

class Session {
    constructor(parent) {
        this.parent   = parent;
        this.operator = '';
        this.driver   = '';
        this.selfie   = '';
        this.photos   = [];
        this.counts   = { ml: 0, shopee: 0, avulso: 0, total: 0 };
        this.codesMap = new Map();
        this.checkCrash();
    }

    saveBackup() {
        const backup = { operator: this.operator, driver: this.driver, selfie: this.selfie, photos: this.photos };
        localStorage.setItem('velozz_active_session', JSON.stringify(backup));
    }

    checkCrash() {
        if (localStorage.getItem('velozz_active_session'))
            document.getElementById('btnRecover').classList.remove('hidden');
    }

    recoverCrash() {
        try {
            const backup = JSON.parse(localStorage.getItem('velozz_active_session'));
            this.operator = backup.operator;
            this.driver   = backup.driver;
            this.selfie   = backup.selfie;
            this.photos   = backup.photos || [];
            this.counts   = { ml: 0, shopee: 0, avulso: 0, total: 0 };
            this.codesMap = new Map();

            document.getElementById('selOperator').value = this.operator;
            document.getElementById('selDriver').value   = this.driver;
            if (this.selfie) {
                document.getElementById('previewSelfie').src          = this.selfie;
                document.getElementById('previewSelfie').style.display = 'block';
                document.getElementById('selfiePlaceholder').style.display = 'none';
            }
            document.getElementById('btnRecover').classList.add('hidden');
            this.start();
        } catch (e) { localStorage.removeItem('velozz_active_session'); }
    }

    start() {
        this.operator = document.getElementById('selOperator').value;
        this.driver   = document.getElementById('selDriver').value;

        if (!this.selfie && this.photos.length === 0) return alert("A Selfie é obrigatória!");
        if (!this.operator || !this.driver) return alert("Selecione Operador e Entregador!");

        this.parent.audio.init();  // prime AudioContext no click → iOS não bloqueia o beep
        this.saveBackup();

        document.getElementById('displayOperator').textContent = `Op: ${this.operator}`;
        document.getElementById('displayDriver').textContent   = this.driver;
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');

        this.parent.ui.renderPhotos();
        this.parent.scanner.init();
    }

    reset(isCancel = false) {
        if (isCancel && !confirm("Cancelar carga? Os dados serão perdidos.")) return;
        localStorage.removeItem('velozz_active_session');
        this.counts   = { ml: 0, shopee: 0, avulso: 0, total: 0 };
        this.codesMap.clear();
        this.photos   = [];
        this.selfie   = '';
        this.driver   = '';
        document.getElementById('selDriver').value = '';
        document.getElementById('previewSelfie').style.display = 'none';
        document.getElementById('selfiePlaceholder').style.display = 'block';
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
            return;
        }

        let type = 'avulso', displayCode = code;

        if (code.includes('hash_code')) {
            type = 'ml';
            try { displayCode = JSON.parse(code).hash_code || "ML"; } catch (e) {}
        } else if (/^BR[A-Z0-9]{10,16}$/i.test(code)) {
            type = 'shopee';
        } else if (code.toLowerCase().includes('mercadolivre') || code.toLowerCase().includes('mercadolibre') || /\bmlb\d+/i.test(code)) {
            type = 'ml';
        }

        this.counts[type]++;
        this.counts.total++;
        this.codesMap.set(code, { display: displayCode, type });

        this.parent.audio.playSuccess();
        this.parent.scanner.flash('ok');
        this.parent.scanner.showBeepVisual(type);
        this.updateUI(type);
    }

    updateUI(lastType = null) {
        document.getElementById('countML').textContent     = this.counts.ml;
        document.getElementById('countShopee').textContent = this.counts.shopee;
        document.getElementById('countAvulso').textContent = this.counts.avulso;
        document.getElementById('countTotal').textContent  = this.counts.total;

        if (lastType) {
            const box = document.getElementById('box-' + lastType);
            if (box) { box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); }
        }

        const list = document.getElementById('historyList');
        list.innerHTML = '';
        Array.from(this.codesMap.entries()).reverse().forEach(([rawCode, data]) => {
            const log = document.createElement('div');
            log.className = 'hist-item';
            const color = data.type === 'ml' ? '#ffe600' : (data.type === 'shopee' ? '#ee4d2d' : '#94a3b8');
            log.innerHTML = `
                <div><span style="color:${color}; font-weight:bold;">[${data.type.toUpperCase()}]</span> ${data.display.substring(0, 22)}...</div>
                <button class="hist-del" onclick="app.session.removePackage('${rawCode.replace(/'/g,"\\'")}')">X</button>
            `;
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
        if (confirm("Apagar leituras?")) {
            this.counts   = { ml: 0, shopee: 0, avulso: 0, total: 0 };
            this.codesMap.clear();
            this.updateUI();
        }
    }

    addPhoto(b64) {
        if (this.photos.length < 8) {
            this.photos.push(b64);
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
        if (confirm("Apagar fotos?")) {
            this.photos = [];
            this.parent.ui.renderPhotos();
            this.saveBackup();
        }
    }
}

class Scanner {
    constructor(parent) {
        this.parent   = parent;
        this.video    = document.getElementById('camVideo');
        this.canvas   = document.getElementById('qrCanvas');
        this.ctx      = this.canvas.getContext('2d', { willReadFrequently: true });
        this.scanning = false;
        this.track    = null;
        this._lastTs  = 0;
    }

    async init() {
        try {
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
                });
            } catch (_) {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            }
            this.video.srcObject = stream;
            this.track = stream.getVideoTracks()[0];
            this.scanning = true;
            this.scan();
        } catch (e) { alert("Câmera bloqueada: " + e.message); }
    }

    stop() {
        this.scanning = false;
        if (this.track) this.track.stop();
    }

    async toggleFlashlight() {
        if (!this.track) return;
        try {
            const cap = this.track.getCapabilities();
            if (!cap.torch) return alert("Lanterna indisponível.");
            this.torchOn = !this.torchOn;
            await this.track.applyConstraints({ advanced: [{ torch: this.torchOn }] });
            document.getElementById('btnFlash').style.background = this.torchOn ? '#ffe600' : 'rgba(0,0,0,0.6)';
        } catch (e) {}
    }

    flash(type) {
        const el = document.getElementById('scanFlash');
        el.className = 'scan-flash'; void el.offsetWidth; el.className = 'scan-flash ' + type;
    }

    showBeepVisual(type) {
        const el = document.getElementById('beepEl');
        el.className = 'beep-ind beep-' + type;
        el.textContent = type === 'ml' ? '🟡' : (type === 'shopee' ? '🔴' : '⚪');
        void el.offsetWidth;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 500);
    }

    scan() {
        if (!this.scanning) return;
        if (this.parent.ui.currentTab === 0 && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.canvas.height = this.video.videoHeight;
            this.canvas.width  = this.video.videoWidth;
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
            if (code && code.data) {
                const now = Date.now();
                if (now - this._lastTs > 1500) {
                    this._lastTs = now;
                    this.parent.session.registerPackage(code.data);
                }
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
        session.photos.forEach((s, i) => sources.push({ src: s, label: 'Foto ' + (i + 1) }));
        if (!sources.length) return null;

        const load = src => new Promise((res, rej) => {
            const img = new Image(); img.crossOrigin = 'anonymous';
            img.onload = () => res(img); img.onerror = rej; img.src = src;
        });

        const loaded = await Promise.allSettled(sources.map(s => load(s.src)));
        const imgs   = loaded.map((r, i) => r.status === 'fulfilled' ? { img: r.value, label: sources[i].label } : null).filter(Boolean);
        if (!imgs.length) return null;

        const COLS = Math.min(imgs.length, 3), ROWS = Math.ceil(imgs.length / COLS), CELL = 320, HDR = 90, PAD = 8;
        const W = COLS * CELL + (COLS + 1) * PAD, H = HDR + ROWS * CELL + (ROWS + 1) * PAD;

        const canvas = document.getElementById('collageCanvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0d0f12'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#161a1f'; ctx.fillRect(0, 0, W, HDR);
        ctx.fillStyle = '#f97316'; ctx.fillRect(0, HDR - 3, W, 3);
        ctx.fillStyle = '#f97316'; ctx.font = 'bold 22px monospace'; ctx.fillText('SAÍDA FLEX VELOZZ', PAD + 8, 32);
        ctx.fillStyle = '#e8eaf0'; ctx.font = '15px monospace'; ctx.fillText(`${session.driver} | Op: ${session.operator}`, PAD + 8, 54);
        const d = new Date();
        ctx.fillStyle = '#6b7280'; ctx.font = '12px monospace';
        ctx.fillText(`${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')} | Total: ${session.counts.total}`, PAD + 8, 74);

        imgs.forEach(({ img, label }, idx) => {
            const col = idx % COLS, row = Math.floor(idx / COLS), x = PAD + col * (CELL + PAD), y = HDR + PAD + row * (CELL + PAD);
            ctx.fillStyle = '#1e2430'; ctx.fillRect(x, y, CELL, CELL);
            const ratio = Math.max(CELL / img.naturalWidth, CELL / img.naturalHeight);
            const dw = img.naturalWidth * ratio, dh = img.naturalHeight * ratio, dx = x + (CELL - dw) / 2, dy = y + (CELL - dh) / 2;
            ctx.save(); ctx.beginPath(); ctx.rect(x, y, CELL, CELL); ctx.clip();
            ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y + CELL - 28, CELL, 28);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.fillText(label, x + 8, y + CELL - 10);
        });

        return new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.88));
    }
}

// ── AudioController ───────────────────────────────────────────────────────
// Usa um único AudioContext por sessão (prime no click de início → iOS).
// Onda quadrada (square) + DynamicsCompressor = beep alto, claro, inconfundível.
// Arpejo C5-E5-G5 em 300ms: impossível de perder num galpão barulhento.
class AudioController {
    constructor() { this.ctx = null; this.unlocked = false; }

    init() {
        if (this.unlocked) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        // Oscilador mudo para desbloquear iOS AudioContext
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.connect(g); g.connect(this.ctx.destination);
        g.gain.value = 0;
        o.start(this.ctx.currentTime); o.stop(this.ctx.currentTime + 0.01);
        this.unlocked = true;
    }

    // Arpejo de três tons ascendentes — beep de SUCESSO (novo pacote)
    playSuccess() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -3; comp.knee.value = 3;
        comp.ratio.value = 8; comp.attack.value = 0; comp.release.value = 0.05;
        comp.connect(this.ctx.destination);
        // C5=523Hz, E5=659Hz, G5=784Hz | onda quadrada = mais volume sem distorção
        [[523.25, 0.00, 0.17], [659.25, 0.07, 0.17], [783.99, 0.14, 0.21]].forEach(([freq, start, dur]) => {
            const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
            osc.connect(gain); gain.connect(comp);
            osc.type = 'square'; osc.frequency.value = freq;
            const t = this.ctx.currentTime + start;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.82, t + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.start(t); osc.stop(t + dur + 0.02);
        });
    }

    // Tom grave descendente — beep de ERRO (duplicado)
    playError() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const comp = this.ctx.createDynamicsCompressor();
        comp.connect(this.ctx.destination);
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(comp);
        osc.type = 'sawtooth'; osc.frequency.value = 260;
        gain.gain.setValueAtTime(0.65, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        osc.start(this.ctx.currentTime); osc.stop(this.ctx.currentTime + 0.32);
    }
}

// ── ExportController ──────────────────────────────────────────────────────
class ExportController {
    constructor(parent) {
        this.parent     = parent;
        // URL vem do config.js — fácil de atualizar sem editar o app.js
        this.sheetsUrl  = APP_CONFIG.sheetsUrl;
        this.waNumber   = APP_CONFIG.waNumber;
        this.updateSyncUI();
        window.addEventListener('online', () => this.syncQueue());
        setInterval(() => {
            const q = JSON.parse(localStorage.getItem('velozz_sync_queue') || '[]');
            if (q.length > 0 && navigator.onLine) this.syncQueue();
        }, 120000);
    }

    getSummary() {
        const s = this.parent.session;
        return [
            '📦 SAÍDA FLEX VELOZZ',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━',
            `👤  Operador: ${s.operator}`,
            `🚚  Entregador: ${s.driver}`,
            '━━━━━━━━━━━━━━━━━━━━━━━━━━',
            `🟡  ML:     ${s.counts.ml}`,
            `🔴  Shopee: ${s.counts.shopee}`,
            `⚪  Avulso: ${s.counts.avulso}`,
            `📦  TOTAL:  ${s.counts.total} pacotes`,
            `📸  Fotos:  ${s.photos.length}`
        ].join('\n');
    }

    // Comprime um dataUrl para maxPx px e quality JPEG — reduz selfie de ~3MB para ~30KB
    compressImage(dataUrl, maxPx = 700, quality = 0.65) {
        return new Promise(res => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
                const w = Math.floor(img.width * scale), h = Math.floor(img.height * scale);
                const c = document.createElement('canvas'); c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                res(c.toDataURL('image/jpeg', quality));
            };
            img.src = dataUrl;
        });
    }

    blobToBase64(blob) {
        return new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(blob); });
    }

    // ─── EXPORTAR PARA WHATSAPP ──────────────────────────────────────────
    // Abre o WhatsApp diretamente no número configurado em APP_CONFIG.waNumber
    // sem passar pelo seletor nativo do SO. A colagem de fotos é enviada ao
    // Sheets/Drive em background antes de abrir o WA.
    async toWhatsApp() {
        if (this.parent.session.counts.total === 0 && this.parent.session.photos.length === 0)
            return alert("Nada para exportar!");

        const btn = document.querySelector('.btn-wa');
        const oldText = btn.textContent;
        btn.textContent = '⏳ PROCESSANDO...';
        btn.disabled = true;

        try {
            // Envia para Sheets em background (não bloqueia o WA)
            const blob = await this.parent.collage.build(this.parent.session);
            let b64 = '';
            if (blob) b64 = await this.blobToBase64(blob);

            const payload = {
                date:     new Date().toLocaleDateString('pt-BR'),
                time:     new Date().toLocaleTimeString('pt-BR'),
                operator: this.parent.session.operator,
                driver:   this.parent.session.driver,
                ml:       this.parent.session.counts.ml,
                shopee:   this.parent.session.counts.shopee,
                avulso:   this.parent.session.counts.avulso,
                total:    this.parent.session.counts.total,
                codes:    Array.from(this.parent.session.codesMap.keys()).join(' | '),
                image:    b64   // colagem comprimida para Drive
            };

            this.sendToSheetsBackground(payload); // fire-and-forget

            // Abre WA no número fixo — sem seletor de app
            const url = `https://wa.me/${this.waNumber}?text=${encodeURIComponent(this.getSummary())}`;
            const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);

            this.parent.session.reset();

        } catch (e) {
            console.error('Erro no export:', e);
            this.parent.session.reset();
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    }

    // ─── GOOGLE SHEETS (background) ──────────────────────────────────────
    // CORREÇÃO CORS:
    //   mode:'no-cors' SEM Content-Type header → browser envia text/plain
    //   (simple CORS request, sem preflight OPTIONS) → Apps Script recebe OK.
    //   COM Content-Type:application/json → preflight → bloqueado → silencioso.
    async sendToSheetsBackground(p) {
        if (!navigator.onLine) return this.saveToQueue(p);
        try {
            await fetch(this.sheetsUrl, {
                method: 'POST',
                mode:   'no-cors',
                // SEM headers → text/plain → simple request → sem preflight ✓
                body:   JSON.stringify(p)
            });
        } catch (e) {
            this.saveToQueue(p);
        }
    }

    saveToQueue(p) {
        const q = JSON.parse(localStorage.getItem('velozz_sync_queue') || '[]');
        q.push(p);
        localStorage.setItem('velozz_sync_queue', JSON.stringify(q));
        this.updateSyncUI();
    }

    async syncQueue() {
        let q = JSON.parse(localStorage.getItem('velozz_sync_queue') || '[]');
        if (!q.length || !navigator.onLine) return;

        const btn = document.getElementById('btnSync');
        btn.textContent = '⏳ SINCRONIZANDO...';
        const ok = [];

        for (let i = 0; i < q.length; i++) {
            try {
                await fetch(this.sheetsUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(q[i]) });
                ok.push(i);
            } catch (e) {}
        }

        if (ok.length) {
            const remaining = q.filter((_, idx) => !ok.includes(idx));
            localStorage.setItem('velozz_sync_queue', JSON.stringify(remaining));
            alert('✅ Sincronizado com a planilha!');
        }
        this.updateSyncUI();
    }

    updateSyncUI() {
        const q = JSON.parse(localStorage.getItem('velozz_sync_queue') || '[]');
        const b = document.getElementById('btnSync');
        if (q.length) {
            b.classList.remove('hidden');
            b.textContent = `🔄 FALTAM ${q.length} PARA A PLANILHA (TOQUE AQUI)`;
        } else {
            b.classList.add('hidden');
        }
    }
}

// ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────
const app = {
    ui:       new UIController(),
    registry: new Registry(),
    session:  null,
    scanner:  null,
    collage:  new CollageBuilder(),
    audio:    new AudioController(),
    export:   null
};

app.session = new Session(app);
app.scanner = new Scanner(app);
app.export  = new ExportController(app);

// ─── FILE HANDLERS ────────────────────────────────────────────────────────

// Selfie: comprime para 700px antes de armazenar → economiza memória e acelera envio
document.getElementById('inputSelfie').onchange = e => {
    if (!e.target.files.length) return;
    const r = new FileReader();
    r.onload = async ev => {
        const compressed = await app.export.compressImage(ev.target.result, 700, 0.7);
        app.session.selfie = compressed;
        document.getElementById('previewSelfie').src           = compressed;
        document.getElementById('previewSelfie').style.display = 'block';
        document.getElementById('selfiePlaceholder').style.display = 'none';
        app.session.saveBackup();
    };
    r.readAsDataURL(e.target.files[0]);
};

// Fotos: comprime cada foto para 800px antes de armazenar
document.getElementById('inputPhoto').onchange = e => {
    Array.from(e.target.files).forEach(f => {
        const r = new FileReader();
        r.onload = async ev => {
            const compressed = await app.export.compressImage(ev.target.result, 800, 0.72);
            app.session.addPhoto(compressed);
        };
        r.readAsDataURL(f);
    });
    e.target.value = ''; // reset para permitir re-selecionar a mesma foto
};
