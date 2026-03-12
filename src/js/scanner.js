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
    this.useNative = 'BarcodeDetector' in window;
    this.detector = null;

    if (this.useNative) {
      const formats = ['qr_code', 'code_128', 'ean_13', 'code_39', 'ean_8', 'itf'];
      BarcodeDetector.getSupportedFormats()
        .then((supported) => {
          const active = formats.filter((f) => supported.includes(f));
          this.detector = new BarcodeDetector({ formats: active });
          console.log('📷 Scanner: BarcodeDetector nativo ativo | Formatos:', active.join(', '));
        })
        .catch(() => {
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
          facingMode: 'environment',
          width: { ideal: 1280 },   // Changed from 1920 to 1280 for better processing speed
          height: { ideal: 720 },   // Changed from 1080 to 720 for better processing speed
        },
      });
      this.video.srcObject = stream;
      this.track = stream.getVideoTracks()[0];
      
      // Try applying continuous focus mode after stream initialization (better support on some devices)
      try {
        await this.track.applyConstraints({
          advanced: [{ focusMode: 'continuous' }]
        });
      } catch(e) { console.log('Continuous focus not supported', e); }
      this.scanning = true;
      this.scan();
    } catch (e) {
      alert('Câmera bloqueada.');
    }
  }

  stop() {
    this.scanning = false;
    if (this.track) this.track.stop();
  }

  async toggleFlashlight() {
    if (!this.track) return;
    try {
      const cap = this.track.getCapabilities();
      if (!cap.torch) return alert('Lanterna indisponível.');
      this.torchOn = !this.torchOn;
      await this.track.applyConstraints({ advanced: [{ torch: this.torchOn }] });
      document.getElementById('btnFlash').style.background = this.torchOn
        ? '#ffe600'
        : 'rgba(0,0,0,0.6)';
    } catch (e) {}
  }

  flash(type) {
    const el = document.getElementById('scanFlash');
    el.className = 'scan-flash';
    void el.offsetWidth;
    el.className = 'scan-flash ' + type;
  }
  showBeepVisual(type) {
    const el = document.getElementById('beepEl');
    el.className = 'beep-ind beep-' + type;
    el.textContent = type === 'ml' ? '🟡' : type === 'shopee' ? '🔴' : '⚪';
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 500);
  }

  showDupAlert() {
    const container = document.getElementById('camContainer');
    const existing = container.querySelector('.dup-alert');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'dup-alert';
    el.textContent = 'DUPLICADO';
    container.appendChild(el);
    setTimeout(() => el.remove(), 1000);
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
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
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
