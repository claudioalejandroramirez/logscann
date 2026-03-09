# LogScann

## Descrição

O **LogScann** é uma aplicação web desenvolvida para otimizar o processo de conferência de pacotes de entregadores na transportadora Flex Velozz. Surgiu da necessidade de verificar manualmente os pacotes após o recebimento de mercadorias de diversos vendedores, já registrados no software LogManager. Anteriormente, a equipe operacional separava os pacotes por CEP (Código de Endereçamento Postal), e os entregadores montavam seus respectivos pacotes. Cada pacote era contado manualmente pela equipe, verificando:

- Quantidade total de pacotes sob responsabilidade do entregador.
- Contagem por marketplace: quantos do Mercado Livre, quantos da Shopee, quantos avulsos.
- Se cada pacote estava registrado na conta do entregador nos respectivos apps dos marketplaces.

Os resultados eram registrados em papel pelo operador, digitados no WhatsApp pelo entregador (incluindo nome do operador, quantidades, classificações por marketplace e prints de tela do celular com evidências de registro). Esses dados eram enviados a um grupo no WhatsApp e conferidos um a um pelo RH para cálculo de comissões. Com aproximadamente 200 entregadores, esse processo era exaustivo, propenso a erros humanos e exigia transferência manual para planilhas de controle.

O LogScann integra-se nativamente com o Google Sheets, permitindo exportação automática de dados e cálculos de valores de pacotes por entregador, eliminando a necessidade de transferências manuais. Além disso, as evidências são compiladas em uma imagem e enviadas via WhatsApp para notificação do RH, enquanto os dados alimentam a planilha em segundo plano. O app utiliza um scanner para beep de todas as encomendas, automatizando o registro, e permite ao operador tirar fotos das telas dos celulares do entregador com as evidências de registro em cada marketplace, compilando tudo em uma imagem única.

## Funcionalidades

- **Scanner para Beep**: Automatiza o registro de encomendas via scanner.
- **Conferência Automatizada**: Conta e classifica pacotes por marketplace.
- **Integração com Google Sheets**: Exportação automática de dados e cálculos de comissões.
- **Registro de Evidências**: Captura de fotos das telas dos celulares do entregador e compilação em imagem para envio.
- **Envio para WhatsApp**: Compila evidências em imagem e envia como mensagem para notificar o RH.
- **Interface Web Responsiva**: Acessível via navegador.
- **Suporte Offline**: Capacidade de reter informações mesmo com instabilidade de rede (via PWA).

## Status do Projeto

Esta é a versão beta do LogScann. As funcionalidades práticas já foram testadas. Os testes atuais concentram-se na latência e na capacidade de lidar com múltiplas solicitações e usuários concorrentes para determinar a capacidade máxima.

## Acesso

O app está sendo servido via GitHub Pages no link: [https://claudioalejandroramirez.github.io/logscann/](https://claudioalejandroramirez.github.io/logscann/)

## Melhorias Futuras

- Desenvolvimento de um app em tecnologia mais avançada para registro de novos entregadores e operadores, sem necessidade de alterações no código fonte.
- Acesso offline aprimorado através de um app instalado, capaz de reter informações mesmo diante de instabilidade da rede.
- Arquivos APK já disponíveis para instalação em dispositivos móveis.

## Stack Tecnológica

O LogScann foi desenvolvido utilizando as seguintes tecnologias:

- **Frontend**:
  - HTML5: Estrutura da interface.
  - CSS3: Estilização responsiva.
  - JavaScript (ES6+): Lógica da aplicação e interações.

- **Backend/Integração**:
  - Google Apps Script (Code.gs): Para integração com Google Sheets, permitindo exportação e cálculos automáticos.

- **Progressive Web App (PWA)**:
  - Manifest.json: Configuração para instalação como app nativo.
  - Service Worker (sw.js): Suporte offline e cache de recursos.

- **Configuração**:
  - config.js: Arquivo de configuração para parâmetros customizáveis.

- **Hospedagem**:
  - GitHub Pages: Hospedagem gratuita e simples para aplicações web estáticas.

## Arquitetura do Software

A arquitetura do LogScann é baseada em uma aplicação web progressiva (PWA) simples e eficiente, projetada para ser leve e acessível:

### Componentes Principais

1. **Interface do Usuário (Frontend)**:
   - `index.html`: Página principal com formulários para entrada de dados (quantidades, marketplaces, evidências).
   - `style.css`: Estilos para uma interface intuitiva e responsiva, otimizada para dispositivos móveis.
   - `app.js`: Lógica JavaScript para validação de dados, integração com scanner para beep, captura de fotos das telas dos celulares, compilação de imagens, envio para WhatsApp e Google Sheets.

2. **Integração com Google Sheets e WhatsApp (Backend)**:
   - `Code.gs`: Script do Google Apps Script executado no lado do servidor do Google. Recebe dados do frontend via APIs do Google, processa e insere na planilha designada. Realiza cálculos automáticos de comissões baseados nas regras definidas. 
   
   - `WhatsApp`: Também auxilia no envio de imagens compiladas (via Canvas) para WhatsApp.

3. **Configuração e Suporte Offline**:
   - `config.js`: Contém configurações como URLs de APIs, chaves de autenticação (se aplicável), e parâmetros de marketplaces.
   - `manifest.json`: Define metadados para instalação como PWA, incluindo ícones, nome e permissões.
   - `sw.js`: Service Worker que cacheia recursos estáticos, permitindo funcionamento offline básico. Armazena dados localmente usando IndexedDB ou similar para sincronização posterior quando a rede estiver disponível.

### Fluxo de Dados

1. **Entrada de Dados**: O operador utiliza o scanner para beep das encomendas, automatizando o registro. Em seguida, insere quantidades, classifica por marketplace e tira fotos das telas dos celulares do entregador com evidências de registro em cada marketplace.
2. **Processamento Local**: `app.js` valida os dados, compila as fotos em uma imagem única (incluindo a foto do operador que fez a conferência), e prepara para envio.
3. **Envio Simultâneo**: A imagem compilada é enviada como mensagem para o WhatsApp (para notificação do RH), e os dados são enviados via fetch API para o endpoint do Google Apps Script.
4. **Processamento no Servidor**: `Code.gs` recebe os dados, insere na planilha e calcula comissões.
5. **Confirmação**: Feedback é retornado ao usuário via interface.

### Considerações de Segurança e Performance

- **Segurança**: Autenticação via Google OAuth para acesso às planilhas. Dados sensíveis são transmitidos via HTTPS.
- **Performance**: Arquitetura leve, sem dependências pesadas. Testes de latência em andamento para otimização.
- **Escalabilidade**: Projetado para múltiplos usuários concorrentes; testes atuais avaliam capacidade máxima.

### Diagrama de Arquitetura (Simplificado)

```
[Operador] --> [Scanner (Beep)] --> [Interface Web (HTML/CSS/JS)] --> [Captura de Fotos] --> [Compilação de Imagem]
                                                                                      |
                                                                                      v
[Envio para WhatsApp] <-- [Service Worker (Offline)] <-- [Google Apps Script] --> [Google Sheets]
```

Para uma visualização mais detalhada, consulte os arquivos fonte no repositório.

## Instalação e Uso

### Pré-requisitos

- Conta Google com acesso ao Google Sheets.
- Navegador moderno com suporte a PWA (Chrome, Firefox, etc.).
- Acesso ao scanner para beep das encomendas.

### Uso

1. Acesse o app via o link: [https://claudioalejandroramirez.github.io/logscann/](https://claudioalejandroramirez.github.io/logscann/)
2. Instale como PWA se desejado (opção "Instalar" no navegador).
3. Utilize o scanner para registrar encomendas via beep.
4. Insira quantidades, classifique por marketplace e tire fotos das evidências.
5. O app compila as imagens e envia para WhatsApp e Google Sheets automaticamente.

## Licença

Este projeto é de uso particular e não está disponível para contribuição externa.

## Contato

Para dúvidas ou sugestões, entre em contato com a equipe de desenvolvimento da Flex Velozz.