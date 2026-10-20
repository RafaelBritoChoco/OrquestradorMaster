#!/usr/bin/env python3
"""Copia a skill para um destino explícito, com layout portable padrão."""
import argparse
import os
from pathlib import Path
import stat
import sys

NAME = 'orquestrador-master'
SOURCE = Path(__file__).absolute().parent.parent / 'skills' / NAME


def redirected(path):
    try:
        info = path.lstat()
    except FileNotFoundError:
        return False
    return stat.S_ISLNK(info.st_mode) or bool(getattr(info, 'st_file_attributes', 0) & getattr(stat, 'FILE_ATTRIBUTE_REPARSE_POINT', 0x400))


def guard(path):
    # Check lexical ancestors before any resolution: resolve would conceal links.
    path = Path(os.path.abspath(path))
    for node in [*reversed(path.parents), path]:
        if redirected(node):
            raise ValueError(f'Link ou reparse point recusado: {node}')
    return path


def inventory(root):
    guard(root)
    result = {}
    for node in sorted(root.rglob('*')):
        guard(node)
        rel = node.relative_to(root).as_posix()
        if node.is_dir():
            result[rel] = None
        elif node.is_file():
            result[rel] = node.read_bytes()
        else:
            raise ValueError(f'Tipo de arquivo recusado: {node}')
    return result


def install(project, dry_run=False, source=SOURCE, layout="portable"):
    if layout not in {"portable", "codex"}:
        raise ValueError("Layout inválido: use portable ou codex.")
    project = guard(project)
    source = guard(source)
    if not project.is_dir():
        raise ValueError('O destino precisa existir e ser um diretório.')
    if not (source / 'SKILL.md').is_file():
        raise ValueError('Origem da skill inválida.')
    target = guard(project / NAME if layout == 'portable' else project / '.agents' / 'skills' / NAME)
    if (project.is_relative_to(source) or target.is_relative_to(source)
            or source.is_relative_to(target)):
        raise ValueError('Sobreposição entre origem e destino recusada; escolha um destino separado da pasta da skill.')
    expected = inventory(source)
    ancestors = [] if layout == 'portable' else [project / '.agents', project / '.agents' / 'skills']
    for ancestor in ancestors:
        if ancestor.exists() and not ancestor.is_dir():
            raise ValueError(f'Ancestral não é diretório: {ancestor}')
    if target.exists():
        if not target.is_dir() or inventory(target) != expected:
            raise ValueError('Destino diferente: nenhuma substituição foi feita.')
        return 'Já instalado; conteúdo idêntico, sem reescrita.'
    if dry_run:
        return f'Dry-run: copiaria {len(expected)} entradas para {target}; nada alterado.'
    # Exclusive mkdir refuses an unexpected destination created after preflight.
    target.parent.mkdir(parents=True, exist_ok=True)
    guard(target.parent)
    target.mkdir(exist_ok=False)
    for rel, data in expected.items():
        node = target / rel
        guard(node.parent)
        if data is None:
            node.mkdir(parents=True, exist_ok=True)
        else:
            node.parent.mkdir(parents=True, exist_ok=True)
            with node.open('xb') as stream:
                stream.write(data)
    if inventory(target) != expected:
        raise ValueError('Cópia incompleta; inspecione o destino antes de reutilizar.')
    return f'Instalado em {target}'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', '--project', dest='destination', required=True, type=Path)
    parser.add_argument('--layout', choices=['portable', 'codex'], default='portable')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    try:
        print(install(args.destination, args.dry_run, layout=args.layout))
    except (OSError, ValueError) as exc:
        print(f'ERRO: {exc}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
