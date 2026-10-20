# Escolha dinâmica e prova de execução

Preserve modelo/esforço principal e escolhas explícitas. Em cada contrato, recomende capacidade proporcional a ambiguidade, risco, acoplamento, tamanho do contexto, verificabilidade e custo total com revisão/falhas. Investigação delimitada e verificável admite capacidade menor; código acoplado e integração exigem executor capaz; revisão relevante exige capacidade crítica e contexto independente. Escale somente diante de ambiguidade concreta, risco ou falha persistente com evidência.

Consulte catálogo e parâmetros realmente disponíveis na ferramenta de conversas visíveis. Registre separadamente recomendado, solicitado e efetivo (este último desconhecido sem confirmação da ferramenta/telemetria). Não há nomes fixos obrigatórios. Não altere runtime global, credenciais ou provider. Arquivo de configuração, presença no catálogo e código-fonte não provam execução.

Não existe `scripts/inspect-runtime.cjs` neste pacote. Não execute caminho inventado nem prometa inspeção automática: use metadados mínimos realmente expostos, filtrando segredos. Sem seleção, declare limite e use somente configuração autorizada; sem chats, coordenador registra bloqueio e aguarda ferramenta/intervenção, sem fallback interno.

Registre custo desconhecido quando faltar medição. Menos contexto não comprova economia total; inclua revisões e falhas. Gateway/Jev exigem autorização e prova própria de roteamento, não presumida por tráfego em proxy.
