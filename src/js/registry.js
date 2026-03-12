/**
 * Registry - Fonte de verdade: Google Sheets
 * localStorage é apenas cache local para uso offline
 */
class Registry {
  constructor() {
    this.operadores = [];
    this.entregadores = [];
    this._pin = null; // PIN validado nesta sessão admin
    this.loadData();
  }

  // Carrega do cache local (offline-first); depois sincroniza em background
  loadData() {
    const localOps = localStorage.getItem('velozz_operators');
    const localDrivers = localStorage.getItem('velozz_drivers');

    this.operadores = localOps ? JSON.parse(localOps) : (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.operadores : []);
    this.entregadores = localDrivers ? JSON.parse(localDrivers) : (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.entregadores : []);

    this._updateCache();
    this.renderAll();

    // Sincroniza em background ao carregar
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.sheetsUrl) {
      this._syncFromSheets(APP_CONFIG.sheetsUrl).catch(() => { });
    }
  }

  _updateCache() {
    localStorage.setItem('velozz_operators', JSON.stringify(this.operadores));
    localStorage.setItem('velozz_drivers', JSON.stringify(this.entregadores));
  }

  renderAll() {
    this._populate('selOperator', this.operadores);
    this._populate('selDriver', this.entregadores);
  }

  _populate(id, list) {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = '<option value="">Selecionar...</option>';
    [...list].sort().forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      el.appendChild(opt);
    });
    if (current) el.value = current;
  }

  // -------------------------------------------------------
  //  Autenticação de PIN via Sheets (sem hardcode no JS)
  // -------------------------------------------------------
  async verifyPin(pin) {
    const url = this._sheetsUrl();
    if (!url) {
      // Fallback offline: não valida remotamente
      console.warn('Sheets URL não configurada. Acesso admin negado offline.');
      return false;
    }
    try {
      const resp = await fetch(`${url}?action=verifyPin&pin=${encodeURIComponent(pin)}`);
      const data = await resp.json();
      if (data.valid) {
        this._pin = pin; // guarda para usar nas operações seguintes
        return true;
      }
      return false;
    } catch (e) {
      console.error('Erro ao verificar PIN:', e);
      return false;
    }
  }

  // -------------------------------------------------------
  //  CRUD com persistência no Sheets
  // -------------------------------------------------------
  async addOperator(name) {
    const clean = name.trim().toUpperCase();
    if (!clean || this.operadores.includes(clean)) return;
    this.operadores.push(clean);
    this._updateCache();
    this.renderAll();
    await this._push('addOperator', clean);
  }

  async removeOperator(name) {
    this.operadores = this.operadores.filter(o => o !== name);
    this._updateCache();
    this.renderAll();
    await this._push('removeOperator', name);
  }

  async addDriver(name) {
    const clean = name.trim().toUpperCase();
    if (!clean || this.entregadores.includes(clean)) return;
    this.entregadores.push(clean);
    this._updateCache();
    this.renderAll();
    await this._push('addDriver', clean);
  }

  async removeDriver(name) {
    this.entregadores = this.entregadores.filter(d => d !== name);
    this._updateCache();
    this.renderAll();
    await this._push('removeDriver', name);
  }

  // -------------------------------------------------------
  //  Sincronização pública (botão "Sincronizar Sheets")
  // -------------------------------------------------------
  async syncFromSheets(url) {
    return this._syncFromSheets(url || this._sheetsUrl());
  }

  async _syncFromSheets(url) {
    if (!url) return false;
    try {
      const resp = await fetch(`${url}?action=getRegistry`);
      const data = await resp.json();
      if (data && Array.isArray(data.operadores)) {
        this.operadores = data.operadores;
        this.entregadores = data.entregadores || [];
        this._updateCache();
        this.renderAll();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Erro ao sincronizar do Sheets:', e);
      return false;
    }
  }

  async _push(action, name) {
    const url = this._sheetsUrl();
    if (!url || !this._pin) return;
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action, name, pin: this._pin }),
      });
    } catch (e) {
      console.error('Erro ao salvar no Sheets:', e);
    }
  }

  _sheetsUrl() {
    // Lê do ExportController se já instanciado, ou do APP_CONFIG
    if (typeof app !== 'undefined' && app.export && app.export.sheetsUrl) {
      return app.export.sheetsUrl;
    }
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.sheetsUrl) {
      return APP_CONFIG.sheetsUrl;
    }
    return null;
  }
}