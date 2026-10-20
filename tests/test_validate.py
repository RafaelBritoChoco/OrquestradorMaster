"""Fixtures sintéticas: ausência, link e licença inválidos não passam."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('validator', Path(__file__).absolute().parent.parent / 'scripts' / 'validate.py')
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class ValidateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_empty_package_reports_missing_without_crashing(self):
        errors = validator.validate(self.root)
        self.assertTrue(any('sources/registry.json' in e for e in errors))
        self.assertTrue(any('SKILL.md' in e for e in errors))

    def test_missing_reference_is_reported(self):
        (self.root / 'README.md').write_text('[recurso](ausente.md)')
        self.assertTrue(any('Link quebrado' in e for e in validator.validate(self.root)))

    def test_license_hash_must_match(self):
        sources = self.root / 'sources'
        sources.mkdir()
        (sources / 'license.txt').write_text('synthetic license')
        registry = {'schema_version': 1, 'repositories': [
            {'id': 'synthetic', 'commit': 'a' * 40, 'license_file': 'license.txt',
             'license_sha256': hashlib.sha256(b'different').hexdigest()}]}
        (sources / 'registry.json').write_text(json.dumps(registry))
        self.assertTrue(any('Hash de licença divergente' in e for e in validator.validate(self.root)))

    def synthetic_registry(self):
        sources = self.root / 'sources'
        sources.mkdir()
        (sources / 'license.txt').write_bytes(b'synthetic license')
        entry = {'repo': 'synthetic/example', 'url': 'https://example.test/repo',
                 'branch': 'main', 'commit': 'a' * 40, 'license': 'Synthetic',
                 'license_url': 'https://example.test/license',
                 'license_file': 'license.txt',
                 'license_sha256': hashlib.sha256(b'synthetic license').hexdigest(),
                 'checked_at': '2026-10-20', 'role': 'synthetic reference',
                 'video_relation': 'synthetic', 'documents': ['README.md']}
        return {'schema_version': 1, 'checked_at': '2026-10-20',
                'video': {field: 'synthetic' for field in
                          ['url', 'title', 'channel', 'published_at', 'analysis_method']},
                'repositories': [dict(entry, id=name) for name in sorted(validator.EXPECTED_SOURCE_IDS)]}

    def test_missing_source_entry_is_reported(self):
        data = self.synthetic_registry()
        data['repositories'].pop()
        (self.root / 'sources/registry.json').write_text(json.dumps(data))
        self.assertTrue(any('seis esperados' in e for e in validator.validate(self.root)))

    def test_duplicate_source_entry_is_reported(self):
        data = self.synthetic_registry()
        data['repositories'].append(data['repositories'][0].copy())
        (self.root / 'sources/registry.json').write_text(json.dumps(data))
        self.assertTrue(any('duplicados' in e for e in validator.validate(self.root)))

    def test_essential_consumer_field_is_required(self):
        data = self.synthetic_registry()
        del data['repositories'][0]['branch']
        (self.root / 'sources/registry.json').write_text(json.dumps(data))
        self.assertTrue(any('Campo essencial' in e and 'branch' in e
                            for e in validator.validate(self.root)))

    def test_malformed_registry_is_reported(self):
        (self.root / 'sources').mkdir()
        (self.root / 'sources/registry.json').write_text('[]')
        self.assertTrue(any('Registry ilegível' in e for e in validator.validate(self.root)))

    def test_complete_distribution_requires_maestro_helpers(self):
        errors = validator.validate(self.root)
        self.assertTrue(any('skills/maestro-economico/scripts/project-state.mjs' in e for e in errors))
        self.assertTrue(any('skills/maestro-economico/LICENSE' in e for e in errors))

    def test_maestro_reference_must_work_after_isolated_copy(self):
        skill = self.root / 'skills' / 'maestro-economico'
        skill.mkdir(parents=True)
        (self.root / 'README.md').write_text('outside package')
        (skill / 'SKILL.md').write_text('[escape](../../README.md)', encoding='utf-8')
        self.assertTrue(any('Maestro não portátil' in e for e in validator.validate(self.root)))

    def test_malformed_maestro_template_is_reported(self):
        examples = self.root / 'skills' / 'maestro-economico' / 'examples'
        examples.mkdir(parents=True)
        (examples / 'new-project.json').write_text('[]')
        self.assertTrue(any('Exemplo Maestro inválido: new-project' in e for e in validator.validate(self.root)))


if __name__ == '__main__':
    unittest.main()
