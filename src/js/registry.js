/**
 * Registry - Gerencia listas de pessoal com LocalStorage
 */
class Registry {
  constructor() {
    this.operadores = [];
    this.entregadores = [];
    this.loadData();
  }

  loadData() {
    const localOps = localStorage.getItem('velozz_operators');
    const localDrivers = localStorage.getItem('velozz_drivers');

    // Se estiver vazio, tenta carregar do config.js (APP_CONFIG)
    this.operadores = localOps ? JSON.parse(localOps) : (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.operadores : []);
    this.entregadores = localDrivers ? JSON.parse(localDrivers) : (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.entregadores : []);

    this.saveData();
  }

  saveData() {
    localStorage.setItem('velozz_operators', JSON.stringify(this.operadores));
    localStorage.setItem('velozz_drivers', JSON.stringify(this.entregadores));
    this.renderAll();
  }

  renderAll() {
    this.populate('selOperator', this.operadores);
    this.populate('selDriver', this.entregadores);
  }

  populate(id, list) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">Selecionar...</option>';
    [...list].sort().forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      el.appendChild(opt);
    });
  }

  addOperator(name) {
    if (name && !this.operadores.includes(name)) {
      this.operadores.push(name);
      this.saveData();
    }
  }

  removeOperator(name) {
    this.operadores = this.operadores.filter(op => op !== name);
    this.saveData();
  }

  addDriver(name) {
    if (name && !this.entregadores.includes(name)) {
      this.entregadores.push(name);
      this.saveData();
    }
  }

  removeDriver(name) {
    this.entregadores = this.entregadores.filter(d => d !== name);
    this.saveData();
  }

  async syncFromSheets(url) {
    try {
      const resp = await fetch(`${url}?action=getRegistry`);
      const data = await resp.json();
      if (data && data.operadores) {
        this.operadores = data.operadores;
        this.entregadores = data.entregadores;
        this.saveData();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Erro sincronia:", e);
      return false;
    }
  }
}