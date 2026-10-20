# Verificar e atualizar com controle

O [registro de fontes](../sources/registry.json) preserva commits e datas consultados. `python3 scripts/check_sources.py` consulta a branch registrada via `git ls-remote`, exige Git/rede e compara o HEAD ao pin: código 0 significa igual; 1, revisão diferente; 2, falha de consulta/registro. Não baixa ou executa conteúdo nem altera arquivos.

Diferença não implica qualidade nem atualização obrigatória. Antes de mudar pins, examine conteúdo, licença e efeitos sobre as conclusões; revise explicitamente metadados/documentos e valide. Falha de rede não prova atualização. Preserve a distinção entre evidência do vídeo e estado posterior dos projetos.

O instalador não força atualização. Se o destino diferir, compare as cópias, preserve o conteúdo existente e decida uma migração apropriada. Não remova automaticamente arquivos para contornar a recusa. Os layouts portable e codex têm as mesmas proteções.

```text
python3 -m unittest discover -s tests -v
python3 scripts/validate.py
```

No Windows, use `py -3.11 -X utf8`. A validação exige pacote e fontes completos, sem modo staging. Não consulta rede, não testa todos os LLMs e não substitui avaliação da qualidade dos resultados. Ensaios de aplicação são separados e permanecem no projeto atendido.
