/**
 * AdminController - Gerencia a autenticação e o painel de CRUD de pessoal
 */
class AdminController {
    constructor(parent) {
        this.parent = parent;
        this.ADMIN_PIN = "1234"; // PIN de acesso padrão
        this.bindEvents();
    }

    bindEvents() {
        const btnOpen = document.getElementById('btnOpenAdmin');
        if (btnOpen) btnOpen.onclick = () => this.openModal();

        const btnVerify = document.getElementById('btnVerifyPin');
        if (btnVerify) btnVerify.onclick = () => this.verifyPin();

        document.getElementById('adminPin').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyPin();
        });

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
            const originalText = btn.textContent;
            btn.textContent = "⏳ SINCRONIZANDO...";
            btn.disabled = true;

            const success = await this.parent.registry.syncFromSheets(this.parent.export.sheetsUrl);

            btn.textContent = success ? "✅ SUCESSO" : "❌ ERRO";
            btn.disabled = false;

            setTimeout(() => btn.textContent = originalText, 3000);
            this.renderLists();
        };
    }

    openModal() {
        document.getElementById('adminOverlay').classList.remove('hidden');
        document.getElementById('adminLoginCard').classList.remove('hidden');
        document.getElementById('adminPanelCard').classList.add('hidden');
        document.getElementById('adminPin').value = '';
        document.getElementById('adminPin').focus();
    }

    verifyPin() {
        const pin = document.getElementById('adminPin').value;
        if (pin === this.ADMIN_PIN) {
            document.getElementById('adminLoginCard').classList.add('hidden');
            document.getElementById('adminPanelCard').classList.remove('hidden');
            this.renderLists();
        } else {
            alert("PIN Incorreto!");
        }
    }

    renderLists() {
        const render = (containerId, items, deleteMethod) => {
            const container = document.getElementById(containerId);
            container.innerHTML = '';
            [...items].sort().forEach(item => {
                const li = document.createElement('li');
                li.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #222; color: #fff; font-family: monospace;";
                li.innerHTML = `
          <span>${item}</span>
          <button class="btn-danger" style="padding: 4px 10px; font-size: 12px; border-radius: 4px;" 
                  onclick="app.admin.${deleteMethod}('${item}')">EXCLUIR</button>
        `;
                container.appendChild(li);
            });
        };

        render('listOperators', this.parent.registry.operadores, 'removeOperator');
        render('listDrivers', this.parent.registry.entregadores, 'removeDriver');
    }

    removeOperator(name) {
        if (confirm(`Deseja remover o operador ${name}?`)) {
            this.parent.registry.removeOperator(name);
            this.renderLists();
        }
    }

    removeDriver(name) {
        if (confirm(`Deseja remover o entregador ${name}?`)) {
            this.parent.registry.removeDriver(name);
            this.renderLists();
        }
    }
}