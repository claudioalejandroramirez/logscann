<p align="center">
  <img src="icon-512.png" alt="LogScann Logo" width="120" height="120" style="border-radius: 20px;">
</p>

<h1 align="center">📦 LogScann — Saída Flex Velozz</h1>

<p align="center">
  <strong>Sistema de conferência automatizada de pacotes para entregadores</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-beta-orange?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/plataforma-PWA-blueviolet?style=flat-square" alt="PWA">
  <img src="https://img.shields.io/badge/frontend-HTML%2FCSS%2FJS-blue?style=flat-square" alt="Frontend">
  <img src="https://img.shields.io/badge/backend-Google%20Apps%20Script-green?style=flat-square" alt="Backend">
  <img src="https://img.shields.io/badge/hospedagem-GitHub%20Pages-lightgrey?style=flat-square" alt="Hospedagem">
</p>

---

## 🧬 Origem do Projeto

> Este app foi criado como um **protótipo via vibe coding** — ou seja, foi gerado e iterado a partir de
> prompts de IA e vem sendo **lapidado progressivamente** com base nos resultados obtidos.
> O objetivo é evoluir de um MVP funcional para uma ferramenta robusta
> de operação, validando cada iteração no ambiente real da transportadora.

---

## 📖 Descrição

O **LogScann** é uma aplicação web (PWA) desenvolvida para a transportadora **Flex Velozz**, com o objetivo de otimizar o processo de conferência de pacotes na saída dos entregadores.

### O problema anterior

Antes do LogScann, o fluxo era totalmente manual:

1. Os pacotes chegavam dos vendedores e eram separados por CEP pela equipe operacional.
2. Cada entregador montava seus pacotes e um operador conferia manualmente:
   - **Quantidade total** de pacotes do entregador
   - **Classificação por marketplace** (Mercado Livre, Shopee, avulsos)
   - **Verificação de registro** em cada app de marketplace
3. Os resultados eram anotados em **papel** pelo operador.
4. O entregador digitava tudo no **WhatsApp** (nome, quantidades, classificações e prints de tela).
5. O **RH** conferia um a um para calcular comissões — com ~200 entregadores, processo exaustivo e propenso a erros.

### A solução

O LogScann automatiza esse fluxo:

- 📷 **Scanner de códigos** via câmera do celular usando a API nativa [`BarcodeDetector`](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) (hardware-accelerated) com fallback para [jsQR](https://github.com/nicolestandifer3/jsqr). Classifica pacotes automaticamente por marketplace, suportando QR codes e códigos de barras 1D.
- 📊 **Integração com Google Sheets** para registro e cálculo automático de comissões.
- 🖼️ **Compilação de evidências em imagem** (collage com selfie do operador + fotos das telas do entregador).
- 📲 **Compartilhamento via WhatsApp** com resumo + imagem compilada para notificação do RH.

---

## ✨ Funcionalidades

| Funcionalidade                 | Descrição                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 📷 **Scanner nativo**          | Lê QR codes e códigos de barras 1D via `BarcodeDetector` (hardware) com fallback `jsQR`. Câmera 1920×1080. Classifica como ML, Shopee ou Avulso |
| 🔦 **Lanterna**                | Controle de flash para leitura em ambientes escuros                                                                                             |
| 📦 **Expectativa de pacotes**  | Campo obrigatório que trava após o primeiro bipe para garantir integridade da conferência                                                       |
| ⚠️ **Detecção de divergência** | Compara pacotes lidos × esperados e exige justificativa em caso de diferença                                                                    |
| 🖼️ **Registro de evidências**  | Captura de até 8 fotos das telas dos apps de marketplace do entregador                                                                          |
| 🧩 **Collage automática**      | Gera imagem compilada com selfie do operador + fotos de evidência + metadados                                                                   |
| 📲 **Compartilhamento**        | Envia resumo + imagem via Web Share API ou link do WhatsApp                                                                                     |
| 📊 **Google Sheets**           | Registro automático de todos os dados + cálculo de valores por marketplace                                                                      |
| ☁️ **Upload de imagens**       | Salva a collage no Google Drive com link público na planilha                                                                                    |
| 🔄 **Fila de sincronização**   | Se offline, armazena os dados em `localStorage` e sincroniza ao reconectar                                                                      |
| 💾 **Recuperação de sessão**   | Backup automático via `localStorage` permite recuperar sessões em caso de crash                                                                 |
| 📱 **PWA**                     | Instalável como app nativo, com cache de assets via Service Worker                                                                              |

---

## 🚀 Acesso

🔗 **[Acessar o LogScann](https://claudioalejandroramirez.github.io/logscann/)**

Também é possível instalar como app nativo (PWA) direto pelo navegador.

---

## 🏗️ Stack Tecnológica

```
Frontend                    Backend / Integração
├── HTML5                   ├── Google Apps Script (Code.gs)
├── CSS3 (responsivo)       ├── Google Sheets (planilha)
├── JavaScript ES6+         └── Google Drive (armazenamento de imagens)
├── BarcodeDetector API
│   (nativo, hardware)      Infraestrutura
└── jsQR (fallback)         ├── GitHub Pages (hospedagem)
                            ├── GitHub Actions (deploy automatizado)
PWA                         └── localStorage (persistência local)
├── manifest.json
└── sw.js (Service Worker)
```

---

## 🏛️ Arquitetura

### Componentes Principais

| Arquivo                                 | Responsabilidade                                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`                            | Interface com 4 abas: Scanner, Histórico, Fotos e Exportar                                                                          |
| `src/css/style.css`                     | Estilização responsiva (tema escuro com accent laranja `#f97316`)                                                                   |
| `src/js/app.js` (etc)                   | Lógica principal: classes `UIController`, `Registry`, `Session`, `Scanner`, `CollageBuilder`, `AudioController`, `ExportController` |
| `src/config.js`                         | Lista de operadores e entregadores cadastrados                                                                                      |
| `google-apps-script/Code.gs`            | Google Apps Script: recebe POST com dados, insere na planilha e faz upload da imagem para o Google Drive                            |
| `google-apps-script/script_properties.json` | Configuração de propriedades do script (ID da planilha, pasta do Drive)                                                             |
| `manifest.json` / `public/`             | Metadados do PWA (ícones, nome, orientação, screenshots)                                                                            |
| `sw.js`                                 | Service Worker com estratégia network-first e fallback para cache                                                                   |
| `.github/workflows/deploy.yml`          | Automação de deploy para o GitHub Pages via GitHub Actions                                                                          |

### Fluxo de Dados

```mermaid
graph TD
    A[👤 Operador] -->|Selfie + Login| B[Tela de Login]
    B -->|Seleciona Operador + Entregador| C[📷 Scanner QR Code]
    C -->|jsQR classifica pacote| D{Tipo?}
    D -->|JSON / MLB...| E[🟡 Mercado Livre]
    D -->|BR...| F[🔴 Shopee]
    D -->|Outro| G[⚪ Avulso]
    E & F & G --> H[📋 Histórico de Leituras]
    H --> I[🖼️ Fotos de Evidência]
    I --> J[📤 Exportar]
    J -->|Gera collage via Canvas| K[🧩 Imagem Compilada]
    K -->|Web Share API| L[📲 WhatsApp]
    K -->|POST fetch| M[Google Apps Script]
    M -->|Insere dados| N[📊 Google Sheets]
    M -->|Upload imagem| O[☁️ Google Drive]
```

### Lógica de Classificação de Pacotes

O scanner identifica automaticamente o marketplace com base no conteúdo do QR Code:

- **Mercado Livre**: QR codes contendo JSON (`{...}`) com chaves como `shipment_id`, `hash_code`, `order_id`, ou códigos de barras lineares no formato `MLB[0-9]+`
- **Shopee**: Códigos no formato `BR[A-Z0-9]{10,16}`
- **Avulso**: Qualquer outro código que não se encaixe nas regras acima

---

## 📲 Instalação e Uso

### Pré-requisitos

- Navegador moderno com suporte a PWA (Chrome recomendado)
- Câmera traseira funcional (para o scanner QR)
- Acesso à internet (para sincronizar com Google Sheets)

### Passo a passo

1. Acesse **[https://claudioalejandroramirez.github.io/logscann/](https://claudioalejandroramirez.github.io/logscann/)**
2. Instale como PWA se desejado _(opção "Instalar" no navegador)_
3. Tire sua **selfie** (obrigatória)
4. Selecione o **operador** e o **entregador**
5. Clique em **▶ INICIAR CONFERÊNCIA**
6. Informe a **expectativa de pacotes** e comece a escanear os QR codes
7. Adicione **fotos das evidências** (telas dos apps do entregador)
8. Na aba **Exportar**, toque em **📲 COMPARTILHAR E FINALIZAR**

---

## 📈 Status do Projeto

| Aspecto                                      | Status                     |
| -------------------------------------------- | -------------------------- |
| Funcionalidades core                         | ✅ Testadas e operacionais |
| Testes de latência                           | 🔄 Em andamento            |
| Testes de concorrência                       | 🔄 Em andamento            |
| Cadastro dinâmico de operadores/entregadores | 📋 Planejado               |

---

## 🔮 Melhorias Futuras

- 🔧 Sistema de cadastro dinâmico de operadores e entregadores (sem necessidade de alterar `config.js`)
- 📶 Aprimoramento do suporte offline com sincronização mais robusta
- 📱 Distribuição via APK para instalação direta em dispositivos móveis
- 🧪 Testes de carga para determinar capacidade máxima de usuários simultâneos

---

## 🔒 Licença

Este projeto é de **uso particular** da Flex Velozz e não está disponível para contribuição externa.

---

## 📬 Contato

Para dúvidas ou sugestões, entre em contato com a equipe de desenvolvimento da **Flex Velozz**.
