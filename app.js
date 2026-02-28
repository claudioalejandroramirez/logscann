/**
 * MOTOR DE OPERAÇÃO - FLEX VELOZZ
 * Versão: 6.1 - Trava de Expectativa & Reinício por Divergência
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

    toggleOtherReason() {
        const sel = document.getElementById('selReason').value;
        const txt = document.getElementById('txtOtherReason');
        if (sel === "Outros") txt.classList.remove('hidden');
        else txt.classList.add('hidden');
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
        this.photos = [];
        this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
        this.codesMap = new Map();
        this.startTime = null;
        this.checkCrash();
    }

    saveBackup() {
        const backup = { operator: this.operator, driver: this.driver, selfie: this.selfie, photos: this.photos, start: this.startTime };
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
            this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
            this.codesMap = new Map();
            document.getElementById('selOperator').value = this.operator;
            document.getElementById('selDriver').value = this.driver;
            
            // Destrava a expectativa caso estivesse travada de um crash passado
            document.getElementById('inputExpected').disabled = false;
            
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
        
        if (!isRecover) this.startTime = Date.now();
        this.parent.audio.init();
        this.saveBackup();

        document.getElementById('displayOperator').textContent = `Op: ${this.operator}`;
        document.getElementById('displayDriver').textContent = this.driver;
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');

        this.parent.ui.renderPhotos();
        this.parent.scanner.init();
    }

    reset(isCancel = false) {
        if (isCancel && !confirm("Cancelar carga? Os dados serão perdidos.")) return;
        localStorage.removeItem('velozz_active_session');
        this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
        this.codesMap.clear(); this.photos = []; this.driver = ''; this.startTime = null;
        document.getElementById('selDriver').value = '';
        
        // Destrava e limpa a expectativa para a próxima sessão
        const expInput = document.getElementById('inputExpected');
        expInput.value = '';
        expInput.disabled = false;
        
        this.updateUI(); this.parent.ui.renderPhotos();
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginOverlay').classList.remove('hidden');
        this.parent.ui.goToTab(0); this.parent.scanner.stop();
    }

    registerPackage(rawCode) {
        // BLOQUEIO DA EXPECTATIVA NO PRIMEIRO BIPE
        if (this.counts.total === 0) {
            const expStr = document.getElementById('inputExpected').value;
            if (!expStr || isNaN(parseInt(expStr)) || parseInt(expStr) <= 0) {
                this.parent.audio.playError();
                alert("⚠️ Obrigatório: Preencha a 'Expectativa de pacotes' antes de iniciar as leituras!");
                document.getElementById('inputExpected').focus();
                return; // Impede a leitura se estiver vazio
            }
            // Trava o campo para não ser editado no meio da conferência
            document.getElementById('inputExpected').disabled = true;
        }

        const code = rawCode.trim();
        if (this.codesMap.has(code)) { this.parent.audio.playError(); this.parent.scanner.flash('dup'); return; }

        let type = 'avulso', displayCode = code;
        
        if (code.startsWith('{') || code.includes('hash_code')) {
            type = 'ml'; 
            try { 
                const parsed = JSON.parse(code); 
                displayCode = parsed.id || parsed.hash_code || "ML_FLEX"; 
            } catch (e) {}
        } else if (/^BR[A-Z0-9]{10,16}$/i.test(code)) { 
            type = 'shopee'; 
        }

        this.counts[type]++; this.counts.total++;
        this.codesMap.set(code, { display: displayCode, type: type });
        this.parent.audio.playSuccess(); this.parent.scanner.flash('ok');
        this.parent.scanner.showBeepVisual(type); this.updateUI(type);
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
            log.innerHTML = `<div><span style="color:${color}; font-weight:bold;">[${data.type.toUpperCase()}]</span> ${data.display.toString().substring(0, 22)}</div><button class="hist-del" onclick="app.session.removePackage('${rawCode}')">X</button>`;
            list.appendChild(log);
        });
    }

    removePackage(code) {
        const item = this.codesMap.get(code);
        if (!item) return;
        this.counts[item.type]--; this.counts.total--; this.codesMap.delete(code); this.updateUI();
        
        // Se deletou o único item e zerou, destrava a expectativa
        if (this.counts.total === 0) {
            document.getElementById('inputExpected').disabled = false;
        }
    }

    clearAll() { 
        if (confirm("Apagar leituras?")) { 
            this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 }; 
            this.codesMap.clear(); 
            this.updateUI(); 
            document.getElementById('inputExpected').disabled = false; // Destrava
        } 
    }
    
    addPhoto(b64) { if (this.photos.length < 8) { this.photos.push(b64); this.parent.ui.renderPhotos(); this.saveBackup(); } }
    removePhoto(index) { this.photos.splice(index, 1); this.parent.ui.renderPhotos(); this.saveBackup(); }
    clearPhotos() { if (confirm("Apagar fotos?")) { this.photos = []; this.parent.ui.renderPhotos(); this.saveBackup(); } }
}

class Scanner {
    constructor(parent) {
        this.parent = parent; this.video = document.getElementById('camVideo');
        this.canvas = document.getElementById('qrCanvas'); this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.scanning = false; this.track = null;
    }
    async init() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 }, advanced: [{ focusMode: "continuous" }] } });
            this.video.srcObject = stream; this.track = stream.getVideoTracks()[0]; this.scanning = true; this.scan();
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
    scan() {
        if (!this.scanning) return;
        if (this.parent.ui.currentTab === 0 && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.canvas.height = this.video.videoHeight; this.canvas.width = this.video.videoWidth;
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
            if (code && code.data) { this.parent.session.registerPackage(code.data); setTimeout(() => requestAnimationFrame(() => this.scan()), 1500); return; }
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
            
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y + CELL - 40, CELL, 40);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace'; ctx.fillText(label, x + 12, y + CELL - 14);
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
        return `📦 SAÍDA FLEX VELOZZ\n--------------------------\nOp: ${s.operator}\nEntregador: ${s.driver}\nDuração: ${this.getDuration()}\n--------------------------\n🟡 ML: ${s.counts.ml}\n🔴 Shopee: ${s.counts.shopee}\n⚪ Avulso: ${s.counts.avulso}\n*TOTAL: ${s.counts.total} pacotes*`;
    }

    blobToBase64(blob) { return new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(blob); }); }

    async toWhatsApp() {
        const expectedStr = document.getElementById('inputExpected').value;
        const expected = parseInt(expectedStr);
        const scanned = this.parent.session.counts.total;

        if (scanned === 0 && this.parent.session.photos.length === 0) return alert("Nada para exportar!");
        
        // Embora já tenhamos travado lá no scanner, esta é uma redundância de segurança.
        if (expectedStr === "" || isNaN(expected) || expected <= 0) {
            app.ui.goToTab(0);
            document.getElementById('inputExpected').focus();
            return alert("Obrigatório: Preencha a Expectativa de pacotes na primeira aba antes de finalizar.");
        }

        if (scanned !== expected) {
            document.getElementById('divergenceText').innerHTML = `Expectativa: <b>${expected}</b> | Lidos: <b>${scanned}</b>`;
            document.getElementById('modalDivergence').classList.remove('hidden');
            return;
        }
        
        this.confirmAndSend();
    }

    async confirmAndSend() {
        const s = this.parent.session;
        const expected = parseInt(document.getElementById('inputExpected').value);
        let finalReason = "S/ Divergência";

        if (s.counts.total !== expected) {
            const reason = document.getElementById('selReason').value;
            
            // INTERCEPTAÇÃO: Se o motivo for "Digitei errado", cancela envio e reseta
            if (reason === "Digitei expectativa errada") {
                alert("🔄 A conferência atual foi reiniciada. Por favor, insira a expectativa correta e bip os pacotes novamente.");
                document.getElementById('modalDivergence').classList.add('hidden');
                s.reset(); // Força o reset sem popup de confirmação extra
                return;
            }

            const otherText = document.getElementById('txtOtherReason').value;
            if (reason === "Outros" && otherText.trim().length < 5) return alert("Descreva o motivo detalhadamente.");
            finalReason = reason === "Outros" ? otherText : reason;
        }

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
                expected: expected, justification: finalReason,
                valML: s.counts.ml * 8, valShopee: s.counts.shopee * 5, valAvulso: s.counts.avulso * 8,
                valTotal: (s.counts.ml * 8) + (s.counts.shopee * 5) + (s.counts.avulso * 8),
                codes: Array.from(s.codesMap.values()).map(item => item.display).join(" | "),
                image: b64
            };

            this.sendToSheetsBackground(payload);

            if (navigator.canShare && blob) {
                const f = new File([blob], 'saida.jpg', { type: 'image/jpeg' });
                await navigator.share({ title: 'Saída Velozz', text: this.getSummary().replace(/📦/g, '*📦*'), files: [f] });
                s.reset();
            } else {
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(this.getSummary())}`);
                s.reset();
            }
        } catch (e) { s.reset(); } finally { btn.textContent = oldText; btn.disabled = false; }
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

// COMPRESSOR DE IMAGENS - Reduz o tamanho da foto sem perder qualidade visual na colagem
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