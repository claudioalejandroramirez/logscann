/**
 * MOTOR DE OPERAÇÃO - FLEX VELOZZ
 * Responsabilidades: UI, Câmera, Sessão, Anti-Crash e Integração Sheets
 */

class UIController {
    constructor() {
        this.currentTab = 0;
        this.totalTabs = 4;
        this.bindSwipe();
    }

    goToTab(index) {
        if(index < 0 || index >= this.totalTabs) return;
        this.currentTab = index;
        document.querySelectorAll('.page').forEach((el, i) => { el.classList.toggle('active', i === index); });
        document.querySelectorAll('.tab-link').forEach((el, i) => { el.classList.toggle('active', i === index); });
        if(index === 3) document.getElementById('exportSummary').textContent = app.export.getSummary();
    }

    nextTab() { this.goToTab(this.currentTab + 1); }
    prevTab() { this.goToTab(this.currentTab - 1); }

    bindSwipe() {
        let touchstartX = 0; let touchendX = 0;
        const container = document.getElementById('swipeContainer');
        container.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, {passive: true});
        container.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            if (touchendX < touchstartX - 60) this.nextTab(); 
            if (touchendX > touchstartX + 60) this.prevTab(); 
        }, {passive: true});
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
        list.sort().forEach(item => { el.innerHTML += `<option value="${item}">${item}</option>`; });
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
        this.checkCrash();
    }

    // COFRE ANTI-CRASH: Salva apenas fotos e dados base
    saveBackup() {
        const backup = {
            operator: this.operator,
            driver: this.driver,
            selfie: this.selfie,
            photos: this.photos
        };
        localStorage.setItem('velozz_active_session', JSON.stringify(backup));
    }

    checkCrash() {
        const backup = localStorage.getItem('velozz_active_session');
        if (backup) {
            document.getElementById('btnRecover').classList.remove('hidden');
        }
    }

    recoverCrash() {
        try {
            const backup = JSON.parse(localStorage.getItem('velozz_active_session'));
            this.operator = backup.operator;
            this.driver = backup.driver;
            this.selfie = backup.selfie;
            this.photos = backup.photos || [];
            this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
            this.codesMap = new Map();
            
            document.getElementById('selOperator').value = this.operator;
            document.getElementById('selDriver').value = this.driver;
            
            if(this.selfie) {
                document.getElementById('previewSelfie').src = this.selfie;
                document.getElementById('previewSelfie').style.display = 'block';
                document.getElementById('selfiePlaceholder').style.display = 'none';
            }
            document.getElementById('btnRecover').classList.add('hidden');
            this.start();
        } catch(e) {
            alert("Erro ao recuperar sessão.");
            localStorage.removeItem('velozz_active_session');
        }
    }

    start() {
        this.operator = document.getElementById('selOperator').value;
        this.driver = document.getElementById('selDriver').value;
        if(!this.selfie && this.photos.length === 0) return alert("A Selfie é obrigatória!");
        if(!this.operator || !this.driver) return alert("Selecione Operador e Entregador!");

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
        if(isCancel && !confirm("Tem certeza que deseja cancelar esta carga? Os dados serão perdidos.")) return;
        
        localStorage.removeItem('velozz_active_session');
        this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
        this.codesMap.clear();
        this.photos = [];
        this.driver = '';
        document.getElementById('selDriver').value = ''; 
        
        this.updateUI();
        this.parent.ui.renderPhotos();
        
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginOverlay').classList.remove('hidden');
        this.parent.ui.goToTab(0);
        this.parent.scanner.stop();
        document.getElementById('btnRecover').classList.add('hidden');
    }
    
    registerPackage(rawCode) {
        const code = rawCode.trim();
        if(this.codesMap.has(code)) {
            this.parent.audio.playError();
            this.parent.scanner.flash('dup');
            return;
        }

        let type = 'avulso';
        let displayCode = code;
        
        if (code.includes('hash_code') || code.includes('sender_id')) {
            type = 'ml';
            try { displayCode = JSON.parse(code).hash_code || "ML_JSON"; } catch(e){}
        } else if (/^BR[A-Z0-9]{10,16}$/i.test(code) || code.toLowerCase().includes('shopee')) {
            type = 'shopee';
        }

        this.counts[type]++;
        this.counts.total++;
        this.codesMap.set(code, { display: displayCode, type: type });
        
        this.parent.audio.playSuccess();
        this.parent.scanner.flash('ok');
        this.parent.scanner.showBeepVisual(type);
        this.updateUI(type);
    }

    removePackage(code) {
        const item = this.codesMap.get(code);
        if(!item) return;
        this.counts[item.type]--;
        this.counts.total--;
        this.codesMap.delete(code);
        this.updateUI();
    }

    clearAll() {
        if(!confirm("Tem certeza que deseja apagar todas as leituras?")) return;
        this.counts = { ml: 0, shopee: 0, avulso: 0, total: 0 };
        this.codesMap.clear();
        this.updateUI();
    }

    addPhoto(b64) { if(this.photos.length < 8) { this.photos.push(b64); this.parent.ui.renderPhotos(); this.saveBackup(); } }
    removePhoto(index) { this.photos.splice(index, 1); this.parent.ui.renderPhotos(); this.saveBackup(); }
    clearPhotos() { if(confirm("Apagar todas as fotos?")) { this.photos = []; this.parent.ui.renderPhotos(); this.saveBackup(); } }

    updateUI(lastType = null) {
        document.getElementById('countML').textContent = this.counts.ml;
        document.getElementById('countShopee').textContent = this.counts.shopee;
        document.getElementById('countAvulso').textContent = this.counts.avulso;
        document.getElementById('countTotal').textContent = this.counts.total;

        if (lastType) {
            const box = document.getElementById('box-' + lastType);
            if (box) {
                box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
                setTimeout(() => box.classList.remove('bump'), 200);
            }
        }
        
        const list = document.getElementById('historyList');
        list.innerHTML = '';
        Array.from(this.codesMap.entries()).reverse().forEach(([rawCode, data]) => {
            const log = document.createElement('div');
            log.className = 'hist-item';
            let color = data.type === 'ml' ? '#ffe600' : (data.type === 'shopee' ? '#ee4d2d' : '#94a3b8');
            log.innerHTML = `<div><span style="color:${color}; font-weight:bold;">[${data.type.toUpperCase()}]</span> ${data.display.substring(0,22)}...</div><button class="hist-del" onclick="app.session.removePackage('${rawCode}')">X</button>`;
            list.appendChild(log);
        });
    }
}

class Scanner {
    constructor(parent) {
        this.parent = parent;
        this.video = document.getElementById('camVideo');
        this.canvas = document.getElementById('qrCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.scanning = false;
        this.track = null;
    }
    
    async init() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 }, advanced: [{ focusMode: "continuous" }] } 
            });
            this.video.srcObject = stream;
            this.track = stream.getVideoTracks()[0];
            this.scanning = true;
            this.scan();
        } catch(e) { alert("Erro ao acessar a câmera: " + e.message); }
    }

    stop() {
        this.scanning = false;
        if (this.track) { this.track.stop(); this.track = null; }
        if (this.video.srcObject) { this.video.srcObject.getTracks().forEach(t => t.stop()); this.video.srcObject = null; }
    }
    
    async toggleFlashlight() {
        if (!this.track) return;
        try {
            const capabilities = this.track.getCapabilities();
            if (!capabilities.torch) return alert("Lanterna não suportada neste aparelho/navegador.");
            this.torchOn = !this.torchOn;
            await this.track.applyConstraints({ advanced: [{ torch: this.torchOn }] });
            document.getElementById('btnFlash').style.background = this.torchOn ? '#ffe600' : 'rgba(0,0,0,0.6)';
        } catch (e) { alert("Erro ao ativar lanterna."); }
    }

    flash(type) {
        const el = document.getElementById('scanFlash');
        el.className = 'scan-flash'; void el.offsetWidth; el.className = 'scan-flash ' + type;
    }

    showBeepVisual(type) {
        const el = document.getElementById('beepEl');
        el.className = 'beep-ind beep-' + type;
        el.textContent = type === 'ml' ? '🟡' : (type === 'shopee' ? '🔴' : '⚪');
        void el.offsetWidth; el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 500);
    }
    
    scan() {
        if(!this.scanning) return;
        if(this.parent.ui.currentTab === 0 && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.canvas.height = this.video.videoHeight;
            this.canvas.width = this.video.videoWidth;
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

            if (code && code.data) {
                this.parent.session.registerPackage(code.data);
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
        session.photos.forEach((s,i) => sources.push({ src: s, label: 'Foto ' + (i+1) }));
        
        if (!sources.length) return null;
        const load = src => new Promise((res, rej) => {
            const img = new Image(); img.crossOrigin='anonymous'; img.onload=()=>res(img); img.onerror=rej; img.src=src;
        });
        const loaded = await Promise.allSettled(sources.map(s => load(s.src)));
        const imgs = loaded.map((r,i) => r.status==='fulfilled' ? { img: r.value, label: sources[i].label } : null).filter(Boolean);
        if (!imgs.length) return null;

        const COLS = Math.min(imgs.length, 3), ROWS = Math.ceil(imgs.length/COLS), CELL = 320, HDR = 90, PAD = 8;
        const W = COLS*CELL + (COLS+1)*PAD, H = HDR + ROWS*CELL + (ROWS+1)*PAD;
        
        const canvas = document.getElementById('collageCanvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle='#0d0f12'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle='#161a1f'; ctx.fillRect(0,0,W,HDR);
        ctx.fillStyle='#f97316'; ctx.fillRect(0,HDR-3,W,3);
        
        ctx.fillStyle='#f97316'; ctx.font='bold 22px monospace'; ctx.fillText('SAÍDA FLEX VELOZZ', PAD+8, 32);
        ctx.fillStyle='#e8eaf0'; ctx.font='15px monospace'; ctx.fillText(`${session.driver} | Op: ${session.operator}`, PAD+8, 54);
        
        const d = new Date();
        ctx.fillStyle='#6b7280'; ctx.font='12px monospace';
        ctx.fillText(`${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')} | Total: ${session.counts.total}`, PAD+8, 74);
        
        imgs.forEach(({img, label}, idx) => {
            const col = idx%COLS, row = Math.floor(idx/COLS), x = PAD+col*(CELL+PAD), y = HDR+PAD+row*(CELL+PAD);
            ctx.fillStyle='#1e2430'; ctx.fillRect(x,y,CELL,CELL);
            const ratio = Math.max(CELL/img.naturalWidth, CELL/img.naturalHeight);
            const dw = img.naturalWidth*ratio, dh = img.naturalHeight*ratio, dx = x+(CELL-dw)/2, dy = y+(CELL-dh)/2;
            ctx.save(); ctx.beginPath(); ctx.rect(x,y,CELL,CELL); ctx.clip();
            ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
            ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(x, y+CELL-28, CELL, 28);
            ctx.fillStyle='#fff'; ctx.font='bold 14px monospace'; ctx.fillText(label, x+8, y+CELL-10);
        });
        return new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.90));
    }
}

class AudioController {
    constructor() { this.ctx = null; this.unlocked = false; }
    init() {
        if (this.unlocked) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!this.ctx && AudioContext) this.ctx = new AudioContext();
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain); gain.connect(this.ctx.destination);
            gain.gain.value = 0; 
            osc.start(this.ctx.currentTime); osc.stop(this.ctx.currentTime + 0.1);
            this.unlocked = true;
        }
    }
    playSuccess() { if(this.ctx){ this.beep(880, 0.1, 0.5); setTimeout(() => this.beep(1100, 0.1, 0.5), 100); } }
    playError() { if(this.ctx) this.beep(200, 0.4, 0.8); }
    beep(freq, duration, vol) {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.start(); osc.stop(this.ctx.currentTime + duration);
    }
}

class ExportController {
    constructor(parent) {
        this.parent = parent;
        // URL OFICIAL DO SEU GOOGLE APPS SCRIPT
        this.sheetsUrl = "https://script.google.com/macros/s/AKfycbxfI9SwcqqJv9aZXg92j0Q8QOaYh5b7oda38sR8hZCpq7Sb7uiIgJGhK2fKEchpcidp/exec"; 
        this.updateSyncUI();
        window.addEventListener('online', () => this.syncQueue());
        setInterval(() => { let q = JSON.parse(localStorage.getItem('velozz_sync_queue')) || []; if(q.length > 0 && navigator.onLine) this.syncQueue(); }, 120000); 
    }

    getSummary() {
        const s = this.parent.session;
        return `📦 SAÍDA FLEX VELOZZ\n--------------------------\nOp: ${s.operator}\nEntregador: ${s.driver}\n--------------------------\n🟡 ML: ${s.counts.ml}\n🔴 Shopee: ${s.counts.shopee}\n⚪ Avulso: ${s.counts.avulso}\nTOTAL: ${s.counts.total} pacotes\n📸 Fotos: ${s.photos.length}`;
    }

    blobToBase64(blob) {
        return new Promise((resolve, _) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    async toWhatsApp() {
        if(this.parent.session.counts.total === 0 && this.parent.session.photos.length === 0) return alert("Nada para exportar!");
        const summary = this.getSummary().replace(/📦/g, '*📦').replace(/TOTAL:/g, '*TOTAL:*');
        const btn = document.querySelector('.btn-wa');
        const oldText = btn.textContent;
        btn.textContent = '⏳ PROCESSANDO...';
        btn.disabled = true;

        try {
            const blob = await this.parent.collage.build(this.parent.session);
            let b64Image = "";
            if (blob) b64Image = await this.blobToBase64(blob);

            // Payload para Planilha
            const payload = {
                date: new Date().toLocaleDateString('pt-BR'), 
                time: new Date().toLocaleTimeString('pt-BR'),
                operator: this.parent.session.operator, 
                driver: this.parent.session.driver,
                ml: this.parent.session.counts.ml, 
                shopee: this.parent.session.counts.shopee, 
                avulso: this.parent.session.counts.avulso,
                total: this.parent.session.counts.total, 
                codes: Array.from(this.parent.session.codesMap.keys()).join(" | "),
                image: b64Image
            };

            // Envio em background (invisível)
            this.sendToSheetsBackground(payload);

            if (navigator.canShare && blob) {
                const file = new File([blob], 'saida_velozz.jpg', { type: 'image/jpeg' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ title: 'Saída Velozz', text: summary, files: [file] });
                    this.parent.session.reset(); 
                    return; 
                }
            }
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(summary)}`);
            this.parent.session.reset(); 
        } catch(e) {
            if (e.name !== 'AbortError') { 
                alert("Navegador bloqueou a foto. Enviando só texto...");
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(summary)}`);
                this.parent.session.reset();
            }
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    }

    async sendToSheetsBackground(payload) {
        if (!navigator.onLine) return this.saveToQueue(payload);
        try {
            await fetch(this.sheetsUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        } catch (e) { this.saveToQueue(payload); }
    }

    saveToQueue(payload) {
        let queue = JSON.parse(localStorage.getItem('velozz_sync_queue')) || [];
        queue.push(payload); 
        localStorage.setItem('velozz_sync_queue', JSON.stringify(queue));
        this.updateSyncUI();
    }

    async syncQueue() {
        let queue = JSON.parse(localStorage.getItem('velozz_sync_queue')) || [];
        if (queue.length === 0 || !navigator.onLine) return;
        const btnSync = document.getElementById('btnSync'); 
        btnSync.textContent = "⏳ SINCRONIZANDO...";
        let successfulIndices = [];
        for (let i = 0; i < queue.length; i++) {
            try { 
                await fetch(this.sheetsUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(queue[i]) }); 
                successfulIndices.push(i); 
            } catch (e) {}
        }
        if (successfulIndices.length > 0) {
            queue = queue.filter((_, index) => !successfulIndices.includes(index));
            localStorage.setItem('velozz_sync_queue', JSON.stringify(queue));
            alert(`✅ ${successfulIndices.length} pendência(s) sincronizada(s)!`);
        }
        this.updateSyncUI();
    }

    updateSyncUI() {
        let queue = JSON.parse(localStorage.getItem('velozz_sync_queue')) || [];
        const btnSync = document.getElementById('btnSync');
        if (queue.length > 0) { 
            btnSync.classList.remove('hidden'); 
            btnSync.textContent = `🔄 FALTAM ${queue.length} PARA A PLANILHA (TOQUE AQUI)`; 
        } else { 
            btnSync.classList.add('hidden'); 
        }
    }
}

// INICIALIZAÇÃO DA APLICAÇÃO
const app = { ui: new UIController(), registry: new Registry(), session: null, scanner: null, collage: new CollageBuilder(), audio: new AudioController(), export: null };
app.session = new Session(app); app.scanner = new Scanner(app); app.export = new ExportController(app);

document.getElementById('inputSelfie').onchange = function(e) {
    if(!e.target.files.length) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        app.session.selfie = event.target.result;
        document.getElementById('previewSelfie').src = event.target.result;
        document.getElementById('previewSelfie').style.display = 'block';
        document.getElementById('selfiePlaceholder').style.display = 'none';
        app.session.saveBackup(); 
    };
    reader.readAsDataURL(e.target.files[0]);
};

document.getElementById('inputPhoto').onchange = function(e) {
    Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(event) { app.session.addPhoto(event.target.result); };
        reader.readAsDataURL(file);
    });
};