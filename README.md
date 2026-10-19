# EletroLab — Projeto elétrico predial

R03 · Mundo SENAI · Técnico em Eletrotécnica · 19/10/2026.

Aplicação estática, em português, sem instalação e sem dependências externas. `dist/index.html` contém interface, logo original SENAI Hub, planta SVG, motor WebGL, dados e lógica.

## R03 · Planta própria e projeto dos alunos

- Tomada visual 2P+T com placa branca, contorno e três furos em triângulo, na planta, na maquete e no inspetor.
- Importação local de PNG, JPG e WebP, até 15 MB; imagem normalizada e incorporada ao projeto/HTML. Não há envio da imagem a um serviço externo.
- Recorte das margens, dimensões reais informadas, pé-direito, sugestão de paredes ortogonais e de ambientes retangulares fechados.
- Editor em dois cliques para ambientes e paredes; nomes, tipos e medidas editáveis; portas, janelas e posição do QD.
- Geração da maquete pela geometria revisada, com móveis ilustrativos conforme o tipo de ambiente e iluminação ligada aos pontos.
- Planejamento por ambiente: total de tomadas gerais, luminárias, interruptores e pontos específicos. Novos pontos distribuídos automaticamente, com circuito e carga editáveis. Quadro, memorial e diagramas acompanham o lançamento.
- Persistência, importação/exportação JSON e HTML offline preservam a imagem e a geometria. A R03 lê os projetos R00/R01; limites: 40 ambientes, 220 paredes e 300 pontos incluindo interruptores.

**Fluxo:** Importar planta → carregar/recortar imagem → aplicar largura, profundidade e pé-direito → sugerir ou desenhar paredes/ambientes → nomear e revisar → inserir portas/janelas → marcar a revisão → Gerar 3D → Projetar pontos. Inserção e movimento individuais continuam pela planta 2D.

O reconhecimento é uma proposta geométrica por contraste e linhas, sem IA ou inferência de escala. Desenhos com móveis, textos, portas abertas, paredes inclinadas ou fundos complexos precisam de correção manual. A representação utiliza paredes horizontais/verticais e ambientes retangulares; divida formas em L em retângulos. PDF, DWG, DXF e IFC não são importados diretamente: exporte a planta como imagem. Nenhum serviço de IA, API ou credencial é necessário.

Ao usar uma nova planta, inicia-se um lançamento vazio; Desfazer recupera o projeto anterior. Editar a planta atual mantém pontos nos ambientes correspondentes e ajusta suas coordenadas proporcionalmente. A geometria nova limpa a confirmação de premissas e deixa comprimentos dos circuitos pendentes para levantamento. Quantitativos não calculam mínimos normativos e não substituem projeto executivo.

## Casa 3D

- Maquete 3D real em WebGL, com órbita, zoom por roda/pinça, teclado e giro automático opcional.
- Paredes externas azuis, interiores brancos, esquadrias com vidro, pisos de madeira e cerâmica, móveis, plantas e eletrodomésticos.
- Vista aberta com paredes cortadas; botão para paredes completas, modo noturno e ampliação da área da casa.
- Luzes e interruptores vinculados aos mesmos pontos/circuitos da planta, do quadro e do memorial. O modo Circuitos mostra os pontos e rotas conceituais.
- Materiais procedurais e sombras; sem biblioteca, imagem remota, CDN ou download de modelos. O HTML funciona offline em navegador com WebGL.
- Vista 2D e perspectiva SVG continuam disponíveis, inclusive quando o dispositivo não oferece WebGL. Inserção e movimento de pontos usam 2D.

Fontes do motor em `src/house3d.js` e `src/house3d.css`; geometria e importação em `src/floor-core.js`, `src/floor-ui.js` e `src/floor-ui.css`. Após editá-las, execute `python3 scripts/embed-3d.py` para incorporá-las em `dist/index.html`. O arquivo distribuído permanece único e autossuficiente.

## Recursos técnicos

- Logo original, fontes ampliadas, cores mais vivas, texturas de piso e mobiliário na perspectiva.
- Memorial paramétrico: cargas, potência ativa/reativa, corrente, capacidade corrigida, queda de tensão e verificações parciais de proteção.
- Quadro de cargas vinculado aos pontos e exportação CSV com os dados técnicos.
- Diagrama unifilar com carimbo, seções declaradas, ligações e identificadores dos dispositivos.
- Multifilar por circuito com todas as cargas, comandos de iluminação, neutro quando aplicável e PE independente; até seis cargas por folha.
- Download de SVG e geração de dossiê HTML com memorial e todas as folhas. Abra o dossiê e use Imprimir / salvar PDF.
- Migração automática dos dados R00, mantendo os pontos e acrescentando as hipóteses técnicas.

## Usar

Baixe o repositório em **Code → Download ZIP**, extraia os arquivos e abra `dist/index.html` no navegador. O aplicativo não exige instalação, chave de API ou banco de dados. Para editar o código, mantenha a estrutura de pastas.

Abra o HTML em um navegador moderno. Na casa 3D, arraste para girar e role para aproximar; em tela de toque, use um ou dois dedos. Pelo teclado, foque a cena e use setas, +, − e Home. Toque nas luminárias para acender/apagar. Ative **Circuitos** para explorar tomadas e interruptores; as chaves laterais ligam/desligam cada circuito. **Modo noturno** evidencia a iluminação e **Ampliar** abre mais espaço para a maquete.

Em **Memorial de cálculo**, edite as premissas e os dados de cada circuito. Comprimentos, seções e calibres iniciais são exemplos editáveis. Valores ausentes permanecem pendentes. Em **Diagramas elétricos**, alterne entre unifilar e multifilar; escolha o circuito e a folha.

Em **Gerar dossiê**, baixe um documento HTML para impressão. Em **Exportar**, leve a aplicação offline, o projeto JSON e o CSV. Cada navegador tem seus próprios dados; o JSON transfere o projeto.

## Método e limites

A residência inicial é fictícia, de 10 × 8 m. Plantas personalizadas usam as dimensões e ambientes informados pelo aluno. Áreas são a soma nominal dos retângulos, sem desconto das paredes. Exemplo de 6 circuitos, 28 pontos de carga e 8 interruptores. Carga aparente atribuída: 13.400 VA. Não há comprovação de mínimos normativos. A maquete 3D usa alturas, portas, esquadrias, móveis e acabamentos ilustrativos; não é modelo BIM/CAD. A iluminação é uma simulação visual com até oito fontes ativas, sem cálculo de iluminância, fotometria ou oclusão de luz entre ambientes. Rotas coloridas são conceituais e não medem comprimentos de eletrodutos.

Arranjo didático: 127/220 V, 2F+N+PE a partir de sistema estrela com fases a 120°. A corrente das fases é estimada por soma vetorial na fundamental, com fatores de demanda declarados; não modela harmônicas nem dimensiona alimentador ou neutro. Ib do circuito usa sua carga instalada.

Queda de tensão: ΔU = 2 Ib (R cosφ + X senφ) L / 1000, com L de ida em metros e R/X em Ω/km; carga equivalente no final do circuito. R = 1000ρ/A. O percentual acumulado depende da queda a montante informada.

Capacidade: Iz = Iz0 × kT × kG. Verificações parciais: Ib ≤ In ≤ Iz; I2 ≤ 1,45Iz; Icn ≥ Icc; queda acumulada ≤ limite declarado; corrente nominal de IDR ≥ In de QF associado. Relações não constituem conformidade global ou coordenação de todos os dispositivos. Fontes e pendências constam no memorial.

Os diagramas são de princípio com aparência técnica. Não têm numeração de bornes de fabricante. Os IDRs são funções genéricas: selecionar modelo compatível com tensão, frequência e ligação, incluindo o circuito de teste. DPS fica pendente de esquema e dispositivo. Neutro, PE, proteções e ensaios exigem revisão específica antes de execução. Não há controle de equipamento físico.

## Verificação

Execute `node tests/verify.cjs`. Os 41 cenários cobrem os cálculos, relações de proteção, fasores, dados incompletos/inválidos, migração, comandos, persistência, exportação, segurança de conteúdo e inclusão dos pontos nos desenhos, malhas 3D, normais, câmera, gestos, comandos ligados às luzes e ausência de WebGL, reconhecimento de imagem sintética, geometria importada, preservação de estado, quantitativos por formulário, exportação e revisão antes da substituição.

Planta, perspectiva e diagramas foram renderizados como SVG e inspecionados na R01. Na R03, os programas de shader e as casas foram compilados/renderizados com OpenGL ES/Mesa nativo em EGL, incluindo dia, noite, paredes completas, circuito C5, circuito de iluminação desligado, planta personalizada e tomada em detalhe. Isso verifica as malhas e shaders, sem substituir um teste de navegador.

Para repetir a verificação gráfica em Linux com EGL/Mesa, NumPy e Pillow: `ELETROLAB_3D_QA_DIR=/tmp/eletrolab-qa node tests/verify.cjs`, depois `python3 tests/render_native.py /tmp/eletrolab-qa`. As imagens são apenas saídas de teste e não são necessárias para o app.

A interface, os downloads, a impressão e o desempenho não passaram por teste em navegador nesta sessão: o recurso control-browser não estava disponível. Conferir no equipamento do evento. Nenhuma revisão técnica ou ensaio físico foi presumido.

## Fontes

Guia de Instalações Elétricas da Schneider Electric, seções Calculation of voltage drop in steady load conditions (Figura G29) e Practical values for a protective scheme (General rules), consultadas em 17/10/2026. NBR 5410:2004 versão corrigida 2008 identificada no catálogo ABNT; verificar o texto integral institucional. NR-10: observar a redação vigente até 31/05/2027 e a transição publicada para 01/06/2027.
