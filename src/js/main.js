const app = {
  ui: new UIController(),
  registry: new Registry(),
  session: null,
  scanner: null,
  collage: new CollageBuilder(),
  audio: new AudioController(),
  export: null,
  admin: null // Adicionado
};

app.session = new Session(app);
app.scanner = new Scanner(app);
app.export = new ExportController(app);
app.admin = new AdminController(app); // Inicializado aqui

// COMPRESSOR DE IMAGENS
const compressImage = (file, callback) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const maxW = 1200;
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

// Eventos de Input
document.getElementById('inputSelfie').onchange = (e) => {
  if (!e.target.files.length) return;
  compressImage(e.target.files[0], (b64) => {
    app.session.selfie = b64;
    document.getElementById('previewSelfie').src = b64;
    document.getElementById('previewSelfie').style.display = 'block';
    document.getElementById('selfiePlaceholder').style.display = 'none';
    app.session.saveBackup();
  });
};

document.getElementById('inputPhoto').onchange = (e) => {
  Array.from(e.target.files).forEach((f) => {
    compressImage(f, (b64) => app.session.addPhoto(b64));
  });
};