/**
 * Registry - Popula selects de operadores e entregadores
 */
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
