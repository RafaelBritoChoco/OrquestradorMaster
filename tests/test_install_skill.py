import importlib.util
from pathlib import Path
import os
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).absolute().parent.parent
spec = importlib.util.spec_from_file_location('installer', ROOT / 'scripts' / 'install_skill.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.project = self.base / 'Projeto com espaços'
        self.project.mkdir()
        (self.project / 'existente.txt').write_text('preservar', encoding='utf-8')
        self.target = self.project / installer.NAME

    def install(self, dry_run=False):
        return installer.install(self.project, dry_run)

    def test_codex_layout_explicit(self):
        target = self.project / '.agents' / 'skills' / installer.NAME
        installer.install(self.project, True, layout='codex')
        self.assertFalse((self.project / '.agents').exists())
        installer.install(self.project, layout='codex')
        self.assertEqual(installer.inventory(target), installer.inventory(installer.SOURCE))
        self.assertIn('Já instalado', installer.install(self.project, layout='codex'))
        changed = target / 'SKILL.md'
        changed.write_text('conteúdo local', encoding='utf-8')
        with self.assertRaises(ValueError):
            installer.install(self.project, layout='codex')
        self.assertEqual(changed.read_text(), 'conteúdo local')

    def test_cli_default_and_explicit_layout(self):
        script = ROOT / 'scripts' / 'install_skill.py'
        default = subprocess.run([sys.executable, str(script), '--destination', str(self.project)], capture_output=True, text=True)
        self.assertEqual(default.returncode, 0, default.stderr)
        self.assertTrue((self.project / installer.NAME / 'SKILL.md').is_file())
        explicit = subprocess.run([sys.executable, str(script), '--project', str(self.project), '--layout', 'codex'], capture_output=True, text=True)
        self.assertEqual(explicit.returncode, 0, explicit.stderr)
        self.assertTrue((self.project / '.agents/skills' / installer.NAME / 'SKILL.md').is_file())

    def test_overlapping_source_and_destination_refused_without_changes(self):
        for layout in ['portable', 'codex']:
            source = self.base / ('synthetic-' + layout) / installer.NAME
            source.mkdir(parents=True)
            (source / 'SKILL.md').write_text('synthetic instructions')
            child = source / 'nested'
            child.mkdir()
            before = installer.inventory(source.parent)
            # Same base, a child of source, and a target equal to source.
            for destination in [source, child, source.parent]:
                for dry_run in [False, True]:
                    if destination == source.parent and layout == 'codex':
                        continue  # This target is separate from source.
                    with self.assertRaisesRegex(ValueError, 'Sobreposição'):
                        installer.install(destination, dry_run, source=source, layout=layout)
                    self.assertEqual(installer.inventory(source.parent), before)

    def test_invalid_layout_refused(self):
        with self.assertRaises(ValueError):
            installer.install(self.project, layout='global')
        self.assertFalse(self.target.exists())

    def test_codex_ancestor_symlink_refused(self):
        outside = self.base / 'outside'
        outside.mkdir()
        (self.project / '.agents').symlink_to(outside, target_is_directory=True)
        with self.assertRaises(ValueError):
            installer.install(self.project, layout='codex')
        self.assertEqual(list(outside.iterdir()), [])

    def test_dry_run_has_no_side_effects(self):
        before = list(self.project.iterdir())
        self.install(True)
        self.assertEqual(list(self.project.iterdir()), before)
        self.assertFalse((self.project / '.agents').exists())

    def test_install_idempotent_and_portable(self):
        self.install()
        self.assertEqual(installer.inventory(self.target), installer.inventory(installer.SOURCE))
        before = {p: p.stat().st_mtime_ns for p in self.target.rglob('*')}
        self.install()
        self.assertEqual(before, {p: p.stat().st_mtime_ns for p in self.target.rglob('*')})
        self.assertEqual((self.project / 'existente.txt').read_text(), 'preservar')
        import re
        for file in self.target.rglob('*.md'):
            for link in re.findall(r'\[[^\]]*\]\(([^)]+)\)', file.read_text(encoding='utf-8')):
                if ':' in link or link.startswith('#'):
                    continue
                self.assertTrue((file.parent / link).is_file(), link)
                self.assertTrue((file.parent / link).resolve().is_relative_to(self.target.resolve()))

    def test_different_destination_is_untouched(self):
        self.install()
        changed = self.target / 'SKILL.md'
        changed.write_text('trabalho do usuário', encoding='utf-8')
        for dry in [False, True]:
            with self.assertRaises(ValueError):
                self.install(dry)
        self.assertEqual(changed.read_text(encoding='utf-8'), 'trabalho do usuário')

    def test_extra_file_is_difference(self):
        self.install()
        (self.target / 'extra.txt').write_text('não perder')
        with self.assertRaises(ValueError):
            self.install()

    def test_missing_project_is_not_created(self):
        missing = self.base / 'ausente'
        with self.assertRaises(ValueError):
            installer.install(missing)
        self.assertFalse(missing.exists())

    def test_symlink_ancestor_refused(self):
        outside = self.base / 'fora'
        outside.mkdir()
        try:
            self.target.symlink_to(outside, target_is_directory=True)
        except OSError as exc:
            self.skipTest(f'Symlink sem privilégio nesta plataforma: {exc}')
        with self.assertRaises(ValueError):
            self.install()
        self.assertEqual(list(outside.iterdir()), [])

    def test_source_symlink_refused(self):
        source = self.base / 'source'
        source.mkdir()
        (source / 'SKILL.md').write_text('x')
        try:
            (source / 'link').symlink_to(self.project, target_is_directory=True)
        except OSError as exc:
            self.skipTest(f'Symlink sem privilégio nesta plataforma: {exc}')
        with self.assertRaises(ValueError):
            installer.install(self.project, source=source)
        self.assertFalse(self.target.exists())

    def test_reparse_attribute_detected(self):
        class Info:
            st_mode = 0o040755
            st_file_attributes = 0x400
        with patch.object(Path, 'lstat', return_value=Info()):
            self.assertTrue(installer.redirected(self.project))
            with self.assertRaises(ValueError):
                installer.guard(self.project)

    @unittest.skipUnless(os.name == 'nt', 'Junction real exige Windows')
    def test_windows_junction_ancestor(self):
        outside = self.base / 'junction-dest'
        outside.mkdir()
        junction = self.target
        result = subprocess.run(['cmd', '/c', 'mklink', '/J', str(junction), str(outside)], capture_output=True, text=True)
        if result.returncode:
            self.skipTest('Junction indisponível: ' + result.stderr)
        try:
            with self.assertRaises(ValueError):
                self.install()
            self.assertEqual(list(outside.iterdir()), [])
        finally:
            junction.rmdir()


if __name__ == '__main__':
    unittest.main()
