# Codex como adaptador opcional

O núcleo Markdown pode ser copiado/anexado em uma conversa. Não exige Codex, plugins ou descoberta automática de skills. Este documento descreve somente um layout opcional; suporte depende do cliente e sua versão, e não foi testado universalmente.

Para um cliente que use `.agents/skills` por projeto:

```text
python3 scripts/install_skill.py --destination /caminho/projeto --layout codex --dry-run
python3 scripts/install_skill.py --destination /caminho/projeto --layout codex
```

O resultado é `.agents/skills/orquestrador-master` dentro do destino explícito, sem configuração global. O alias `--project` continua aceito, mas não seleciona layout: declare `--layout codex` quando o quiser. O padrão permanece `portable`.

Se o cliente reconhecer a skill, invoque `$orquestrador-master`. Caso contrário, peça a leitura explícita de `SKILL.md` e suas referências, ou anexe o núcleo. `agents/openai.yaml` é metadado opcional do adaptador; não é dependência do procedimento.

Confira a [documentação de skills](https://learn.chatgpt.com/docs/build-skills) do cliente efetivamente usado. Nenhum utilitário deste pacote troca modelo, chave de API, runtime ou plugin. Ferramentas Draw.io/Ponytail/improve/SkillSpector são opcionais e sua instalação exige avaliação separada.
