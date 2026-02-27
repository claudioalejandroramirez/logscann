// config.js
// ═══════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO CENTRAL — edite aqui para ajustar sem mexer no app.js
// ═══════════════════════════════════════════════════════════════════════

const APP_CONFIG = {

    // ── EQUIPA ─────────────────────────────────────────────────────────
    // Adicione ou remova nomes sempre entre aspas, separados por vírgula.
    operadores: [
        "Ana Paula",
        "Bruno Silva",
        "Carlos Eduardo",
        "Fernanda Lima"
    ],
    entregadores: [
        "João Paulo",
        "Marcos Santos",
        "Lucas Oliveira",
        "Rafael Costa",
        "Motorista Avulso"
    ],

    // ── WHATSAPP ───────────────────────────────────────────────────────
    // Número destino do resumo. Formato: código do país + DDD + número.
    // Sem espaços, traços ou +. Exemplo: 5511911777517
    waNumber: "5511911777517",

    // ── GOOGLE SHEETS ──────────────────────────────────────────────────
    // Cole aqui a URL gerada em:
    //   script.google.com → Implantar → Nova implantação → App Web
    //   Executar como: Eu | Acesso: Qualquer pessoa
    sheetsUrl: "https://script.google.com/macros/s/AKfycbzpx5Se-nzOjr81mhK70UHN_Ieq6ojMP4sz3sy-LUji7E2Tyla_x4zMFhHigy5icEgj/exec"
};
