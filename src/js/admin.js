class AdminController {
    constructor(parent) {
        this.parent = parent;
        this.ADMIN_PIN = "1234";
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('btnOpenAdmin').onclick = () => this.openModal();
        document.getElementById('btnVerifyPin').onclick = () => this.verifyPin();

        document.getElementById('btnAddOperator').onclick = () => {
            const input = document.getElementById('newOperatorName');
            const name = input.value.trim().toUpperCase();
            if (name) {
                this.parent.registry.addOperator(name);
                input.value = '';
                this.renderLists();
            }
        };

        document.getElementById('btnAddDriver').onclick = () => {
            const input = document.getElementById('newDriverName');
            const name = input.value.trim().toUpperCase();
            if (name) {
                this.parent.registry.addDriver(name);
                input.value = '';
                this.renderLists();
            }
        };

        document.getElementById('btnSyncAdmin').onclick = async () => {
            const btn = document.getElementById('btnSyncAdmin');
            btn.textContent = "⏳...";
            const success = await this.parent.registry.syncFromSheets(this.parent.export.sheetsUrl);
            btn.textContent = success ? "✅ OK" : "❌ ERRO";
            setTimeout(() => btn.textContent = "🔄 SINCRONIZAR SHEETS", 2000);
            this.renderLists();
        };
    }

    openModal() {
        document.getElementById('adminOverlay').classList.remove('hidden');
        document.getElementById('adminLoginCard').classList.remove('hidden');
        document.getElementById('adminPanelCard').classList.add('hidden');
    }

    verifyPin() {
        if (document.getElementById('adminPin').value === this.ADMIN_PIN) {
            document.getElementById('adminLoginCard').classList.add('hidden');
            document.getElementById('adminPanelCard').classList.remove('hidden');
            this.renderLists();
        } else {
            alert("PIN Errado!");
        }
    }

    renderLists() {
        const render = (id, items, method) => {
            const el = document.getElementById(id);
            el.innerHTML = '';
            items.forEach(item => {
                const li = document.createElement('li');
                li.style.cssText = "display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #222;";
                li.innerHTML = `<span>${item}</span><button onclick="app.admin.${method}('${item}')" style="color:red; background:none; border:none;">X</button>`;
                el.appendChild(li);
            });
        };
        render('listOperators', this.parent.registry.operadores, 'removeOperator');
        render('listDrivers', this.parent.registry.entregadores, 'removeDriver');
    }

    removeOperator(n) { if (confirm("Remover?")) { this.parent.registry.removeOperator(n); this.renderLists(); } }
    removeDriver(n) { if (confirm("Remover?")) { this.parent.registry.removeDriver(n); this.renderLists(); } }
}