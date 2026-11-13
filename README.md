# Hormones Protocolos

Segundo cérebro médico da Hormones Mentoring Elite. O médico escolhe a demanda do paciente, vê o protocolo completo (estrutura, ativos, doses, vias e orientações) e baixa em PDF.

Site estático: `index.html` traz o conteúdo, as imagens e o gerador de PDF (html2pdf.js via cdnjs). Publicado no Vercel sem etapa de build.

## Leitor de teste genético (`/genetica`)

Sem inteligência artificial e sem servidor: tudo roda no navegador e o laudo não sai do computador do médico.

1. O médico envia o PDF do laudo (ou cola o texto). O pdf.js extrai o texto.
2. A página procura genes, rsIDs, genótipos e palavras de resultado ("risco aumentado", "normal", "metabolizador lento"...) e também achados clínicos citados ("Hashimoto", "triglicerídeos"...). Com isso marca as predisposições, que o médico confere e corrige.
3. O médico diz se tem injetáveis, quais protocolos Hormones já aplica, quais injetáveis próprios usa e quais tecnologias tem.
4. Regras fixas indicam o melhor formato para cada situação e os protocolos Hormones, com ajustes pela genética, exames e cuidados. Baixa em PDF.

As regras ficam em `genetica-regras.js` (genes e alelos de risco, predisposições, pesos dos protocolos, ativos, tecnologias). Para calibrar com o laudo de um laboratório novo, ajuste esse arquivo.

Limite: só lê PDF com texto. Laudo escaneado como imagem precisa ter o texto colado ou as predisposições marcadas à mão.

### Plano de tratamento e dados dos protocolos

A etapa 4 do `/genetica` mostra o plano de tratamento no mesmo formato do painel principal, com o corpo e o protocolo completo. Os dados vêm de `genetica-dados.js`, gerado a partir do `index.html`. Sempre que um protocolo ou imagem mudar no `index.html`, rode:

    node scripts/gerar-dados-genetica.js

A escolha dos protocolos e as respostas ficam salvas no navegador do médico por 24 horas (botão "Novo laudo" apaga). O PDF sai em tema escuro ou claro.
