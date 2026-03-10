/**
 * Scanner - Leitura de QR/barcode via BarcodeDetector nativo com fallback jsQR
 */
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
        } catch (e) { }
    }

    flash(type) { const el = document.getElementById('scanFlash'); el.className = 'scan-flash'; void el.offsetWidth; el.className = 'scan-flash ' + type; }
    showBeepVisual(type) { const el = document.getElementById('beepEl'); el.className = 'beep-ind beep-' + type; el.textContent = type === 'ml' ? '🟡' : (type === 'shopee' ? '🔴' : '⚪'); void el.offsetWidth; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 500); }

    showDupAlert() {
        const container = document.getElementById('camContainer');
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
                } catch (e) { }
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
