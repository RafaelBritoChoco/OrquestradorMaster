#!/usr/bin/env python3
"""Compara pins com HEAD remoto; não baixa nem executa conteúdo upstream."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--registry', type=Path, default=Path(__file__).absolute().parent.parent / 'sources' / 'registry.json')
    args = parser.parse_args()
    try:
        registry = json.loads(args.registry.read_text(encoding='utf-8-sig'))
        repos = registry['repositories']
        if registry['schema_version'] != 1 or not isinstance(repos, list) or not repos:
            raise ValueError('Registro vazio ou esquema incompatível.')
    except (OSError, ValueError, KeyError) as exc:
        print(f'ERRO no registro: {exc}', file=sys.stderr)
        return 2
    changed, failed = False, False
    for repo in repos:
        try:
            name, branch, pin = repo['repo'], repo['branch'], repo['commit']
            if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', name):
                raise ValueError('repo deve ser owner/name do GitHub')
            if not re.fullmatch(r'[A-Za-z0-9_./-]+', branch) or branch.startswith('-') or '..' in branch:
                raise ValueError('branch inválida')
            if not re.fullmatch(r'[0-9a-fA-F]{40}', pin):
                raise ValueError('commit precisa ter 40 caracteres hexadecimais')
            result = subprocess.run(['git', 'ls-remote', '--exit-code', f'https://github.com/{name}.git', f'refs/heads/{branch}'], capture_output=True, text=True, timeout=30, check=True)
            lines = result.stdout.strip().splitlines()
            if len(lines) != 1 or not re.fullmatch(r'[0-9a-fA-F]{40}', lines[0].split()[0]):
                raise ValueError('resposta remota inesperada')
            actual = lines[0].split()[0]
            differs = actual.lower() != pin.lower()
            changed |= differs
            print(f'{name}: {"DIFERENTE" if differs else "igual"} pin={pin} remoto={actual}')
        except (KeyError, ValueError, OSError, subprocess.SubprocessError) as exc:
            failed = True
            print(f'ERRO em {repo.get("id", "fonte")}: {exc}', file=sys.stderr)
    return 2 if failed else 1 if changed else 0


if __name__ == '__main__':
    sys.exit(main())
