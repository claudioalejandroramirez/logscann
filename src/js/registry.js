/**
 * Registry - Gerencia listas de pessoal com suporte a LocalStorage e Fallback
 */
class Registry {
  constructor() {
    this.operadores = [];
    this.entregadores = [];
    this.loadData();
  }

  loadData() {
    // Tenta carregar do armazenamento do navegador
    const localOps = localStorage.getItem('velozz_operators');
    const localDrivers = localStorage.getItem('velozz_drivers');

    // Se não existir nada salvo, usa o que está no config.js (APP_CONFIG)
    this.operadores = localOps ? JSON.parse(localOps) : (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.operadores : []);
    this.entregadores = localDrivers ? JSON.parse(localDrivers) : (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.entregadores : []);

    // Salva para garantir que o localStorage esteja populado
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
    // Ordena alfabeticamente para facilitar a busca
    [...list].sort().forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      el.appendChild(opt);
    });
  }

  // Métodos de alteração
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

  // Busca dados atualizados do Google Sheets
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