#!/usr/bin/env python3
"""Valida somente o pacote completo, suas referências e fontes, sem rede."""
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).absolute().parent.parent
EXPECTED_SOURCE_IDS = {'drawio', 'drawio-mcp', 'drawio-skill-community',
                       'ponytail', 'improve', 'skillspector'}


def validate(root=ROOT):
    root = Path(root).resolve()
    errors = []
    required = ['README.md', 'AGENTS.md', 'VERSION', 'CHANGELOG.md', 'LICENSE',
                'THIRD_PARTY_NOTICES.md', 'sources/registry.json', 'sources/README.md',
                'skills/orquestrador-master/SKILL.md',
                'skills/orquestrador-master/agents/openai.yaml',
                'skills/orquestrador-master/references/inventario.md',
                'skills/orquestrador-master/references/auditoria.md',
                'skills/orquestrador-master/references/execucao.md',
                'docs/workflow.md', 'docs/codex.md', 'docs/conceitos.md',
                'docs/atualizacao.md', 'scripts/install_skill.py',
                'scripts/check_sources.py', 'scripts/validate.py',
                'tests/test_install_skill.py', 'tests/test_validate.py']
    for rel in required:
        if not (root / rel).is_file():
            errors.append(f'Arquivo obrigatório ausente: {rel}')
    if (root / 'VERSION').is_file() and (root / 'VERSION').read_text().strip() != '0.2.0':
        errors.append('VERSION deve ser 0.2.0')
    skill = root / 'skills' / 'orquestrador-master'
    entry = skill / 'SKILL.md'
    if entry.is_file():
        body = entry.read_text(encoding='utf-8')
        match = re.match(r'\A---\n(.*?)\n---\n', body, re.S)
        if not match:
            errors.append('Frontmatter ausente')
        elif (re.findall(r'^([a-z_]+):', match.group(1), re.M) != ['name', 'description']
              or 'name: orquestrador-master' not in match.group(1)
              or not re.search(r'^description: \S.+', match.group(1), re.M)):
            errors.append('Frontmatter precisa conter somente name e description corretos')
    interface = skill / 'agents' / 'openai.yaml'
    if interface.is_file():
        yaml = interface.read_text(encoding='utf-8')
        if '$orquestrador-master' not in yaml:
            errors.append('default_prompt sem invocação literal')
        for line in yaml.splitlines():
            if re.match(r'^  \w+:', line) and not re.match(r'^  \w+: ".*"$', line):
                errors.append('Strings de interface devem estar entre aspas')
    for file in root.rglob('*.md'):
        content = file.read_text(encoding='utf-8-sig')
        for target in re.findall(r'\[[^\]]*\]\(([^\s)]+)\)', content):
            if re.match(r'^[a-zA-Z][\w+.-]*:', target) or target.startswith('#'):
                continue
            path = (file.parent / unquote(target.split('#')[0])).resolve()
            if not path.is_relative_to(root):
                errors.append(f'Link fora do pacote: {file.relative_to(root)} -> {target}')
            elif not path.exists():
                errors.append(f'Link quebrado: {file.relative_to(root)} -> {target}')
            if file.is_relative_to(skill) and not path.is_relative_to(skill):
                errors.append(f'Skill não portátil: {target}')
    registry = root / 'sources' / 'registry.json'
    if registry.is_file():
        try:
            data = json.loads(registry.read_text(encoding='utf-8-sig'))
            if not isinstance(data, dict) or data.get('schema_version') != 1:
                raise ValueError('Esquema inválido')
            repos = data.get('repositories')
            if not isinstance(repos, list) or not repos:
                raise ValueError('Lista de fontes ausente')
            ids = [repo.get('id') for repo in repos if isinstance(repo, dict)]
            if set(str(value) for value in ids) != EXPECTED_SOURCE_IDS:
                errors.append('IDs de fontes diferentes dos seis esperados')
            if len(ids) != len(set(str(value) for value in ids)):
                errors.append('IDs de fontes duplicados')
            for field in ['checked_at']:
                if not isinstance(data.get(field), str) or not data[field].strip():
                    errors.append(f'Campo essencial do registry ausente: {field}')
            video = data.get('video')
            if not isinstance(video, dict) or any(
                    not isinstance(video.get(field), str) or not video[field].strip()
                    for field in ['url', 'title', 'channel', 'published_at', 'analysis_method']):
                errors.append('Metadados essenciais do vídeo ausentes')
            for repo in repos:
                if not isinstance(repo, dict):
                    raise ValueError('Entrada de fonte inválida')
                for field in ['id', 'repo', 'url', 'branch', 'commit', 'license',
                              'license_url', 'license_file', 'license_sha256',
                              'checked_at', 'role', 'video_relation']:
                    if not isinstance(repo.get(field), str) or not repo[field].strip():
                        errors.append(f'Campo essencial de fonte ausente: {repo.get("id")} / {field}')
                name, branch = str(repo.get('repo', '')), str(repo.get('branch', ''))
                if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', name):
                    errors.append(f'Nome de repositório inválido: {repo.get("id")}')
                if not re.fullmatch(r'[A-Za-z0-9_./-]+', branch) or branch.startswith('-') or '..' in branch:
                    errors.append(f'Branch inválida: {repo.get("id")}')
                for field in ['url', 'license_url']:
                    if not str(repo.get(field, '')).startswith('https://'):
                        errors.append(f'URL de fonte inválida: {repo.get("id")} / {field}')
                documents = repo.get('documents')
                if not isinstance(documents, list) or not documents or any(
                        not isinstance(doc, str) or not doc.strip() for doc in documents):
                    errors.append(f'Documentos de fonte ausentes: {repo.get("id")}')
                if not re.fullmatch('[0-9a-fA-F]{40}', str(repo.get('commit', ''))):
                    errors.append(f'Pin inválido: {repo.get("id")}')
                rel = repo.get('license_file')
                digest = repo.get('license_sha256')
                if not isinstance(rel, str) or not re.fullmatch('[0-9a-fA-F]{64}', str(digest)):
                    errors.append(f'Registro de licença inválido: {repo.get("id")}')
                    continue
                license_path = (root / 'sources' / rel).resolve()
                if not license_path.is_relative_to(root / 'sources') or not license_path.is_file():
                    errors.append(f'Licença ausente ou fora de sources: {rel}')
                elif hashlib.sha256(license_path.read_bytes()).hexdigest() != digest.lower():
                    errors.append(f'Hash de licença divergente: {rel}')
        except (OSError, ValueError, TypeError) as exc:
            errors.append(f'Registry ilegível: {exc}')
    return errors


def main():
    # No permissive mode: a distribution must include all its own sources.
    import argparse
    argparse.ArgumentParser(description=__doc__).parse_args()
    errors = validate()
    for error in errors:
        print(f'ERRO: {error}')
    print(f'{len(errors)} erro(s) estruturais')
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
