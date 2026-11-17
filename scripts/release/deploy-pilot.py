"""Run under flock on the pilot deployment lock. No migrations or shared restarts."""
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

ROOT = Path('/opt/mamaison-pilote')
DOMAIN = 'https://pilote-mamaison.157-180-42-119.sslip.io'
TARGETS = ['mamaison_pilote_api', 'mamaison_pilote_web']
EXPECTED = {
    'mamaison_pilote_api': 'sha256:718a43579e68cf75c9736cb84e11bcfe06689d9900d97542d4d09095b45ca502',
    'mamaison_pilote_web': 'sha256:abc00ec62850fce46db0acf605116e5272a1922e55e7865351adaec730c61f27',
}

def output(args):
    return subprocess.check_output(args, text=True).strip()

def inspect(names):
    return {x['Name'].lstrip('/'): x for x in json.loads(output(['docker', 'inspect', *names]))}

def states(names):
    template = '{"Name":{{json .Name}},"Id":{{json .Id}},"Image":{{json .Image}},"RestartCount":{{json .RestartCount}},"State":{"Running":{{json .State.Running}}}}'
    return {x['Name'].lstrip('/'): x for x in (json.loads(line) for line in
        output(['docker', 'inspect', '--format', template, *names]).splitlines())}

def stored_files():
    result = {}
    for name in ['uploads', 'private-verification', 'site-settings', 'keys']:
        root = ROOT / 'data' / name
        assert root.is_dir(), f'Missing preserved volume: {name}'
        digest = hashlib.sha256()
        files = sorted(p for p in root.rglob('*') if p.is_file())
        for p in files:
            digest.update(str(p.relative_to(root)).encode())
            digest.update(hashlib.sha256(p.read_bytes()).digest())
        result[name] = {'files': len(files), 'digest': digest.hexdigest()}
    return result

def public_json(path):
    with urllib.request.urlopen(DOMAIN + path, timeout=20) as response:
        return json.load(response)

def activate(override):
    subprocess.run(['docker', 'compose', '-p', 'mamaison-pilote', '-f', str(ROOT / 'compose.yml'),
        '-f', str(override), 'up', '-d', '--no-deps', 'api', 'web'], check=True)

def main():
    os.umask(0o077)
    release = Path(sys.argv[1]).resolve()
    assert release.parent == ROOT / 'releases', 'Wrong release directory'
    manifest = json.loads((release / 'manifest.json').read_text())
    sha = manifest['commit']
    assert release.name == sha and len(sha) == 40 and all(c in '0123456789abcdef' for c in sha)
    assert manifest['projectId'] == 'mamaison' and manifest['environment'] == 'pilote'
    for rel, expected in manifest['files'].items():
        p = (release / rel).resolve()
        assert p.is_relative_to(release) and hashlib.sha256(p.read_bytes()).hexdigest() == expected, f'Artifact mismatch: {rel}'
    names = output(['docker', 'ps', '--format', '{{.Names}}']).splitlines()
    before = states(names)
    pilot_before = inspect(TARGETS)
    for name in TARGETS:
        assert before[name]['Image'] == EXPECTED[name], f'Target changed: {name}'
        assert before[name]['State']['Running']
    api_mounts = {m['Destination']: m['Source'] for m in pilot_before[TARGETS[0]]['Mounts']}
    for name, target in [('uploads', '/app/wwwroot/uploads'), ('private-verification', '/app/data/private-verification'),
                         ('site-settings', '/app/data/site-settings'), ('keys', '/root/.aspnet/DataProtection-Keys')]:
        assert api_mounts.get(target) == str(ROOT / 'data' / name), 'Unexpected pilot storage'
    config = json.loads(output(['docker', 'compose', '-p', 'mamaison-pilote', '-f', str(ROOT / 'compose.yml'), 'config', '--format', 'json']))
    assert config['services']['api']['container_name'] == TARGETS[0]
    assert config['services']['web']['container_name'] == TARGETS[1]
    connection = next(v for k, v in config['services']['api'].get('environment', {}).items() if k.startswith('ConnectionStrings__'))
    database = re.search(r'(?:Database|Initial Catalog)\s*=\s*([^;]+)', connection, re.I)
    assert database and database.group(1) == 'MaMaisonPiloteDb', 'Wrong database'
    volumes = stored_files()
    configuration_hash = hashlib.sha256((ROOT / '.env.api').read_bytes()).hexdigest()
    expected_demo = json.loads((ROOT / 'data/site-settings/site-settings.json').read_text())['Demo3dEnabled']
    assert config['services']['api']['environment'].get('ASPNETCORE_ENVIRONMENT') == 'Production'
    assert len(config['services']['api']['environment'].get('Jwt__Secret', '')) >= 32
    # Contains environment secrets: keep backup private, never print its contents.
    (release / 'before.private.json').write_text(json.dumps(pilot_before))
    (release / 'protected-containers.json').write_text(json.dumps(before))
    (release / 'compose.before.yml').write_bytes((ROOT / 'compose.yml').read_bytes())
    rollback = release / 'rollback.json'
    rollback.write_text(json.dumps({'services': {'api': {'image': before[TARGETS[0]]['Image']},
                                                'web': {'image': before[TARGETS[1]]['Image']}}}))
    images = {}
    for component in ['api', 'web']:
        tag = f'mamaison-pilote-{component}:{sha}'
        subprocess.run(['docker', 'build', '--memory=384m', '--label', f'org.opencontainers.image.revision={sha}',
            '--label', 'ci.mamaison.environment=pilote', '-t', tag, '-f', str(release / f'Dockerfile.{component}'), str(release)], check=True)
        images[component] = output(['docker', 'image', 'inspect', tag, '--format', '{{.Id}}'])
    subprocess.run(['docker', 'run', '--rm', '--network', 'mamaison-pilote_pilot',
                    images['web'], 'nginx', '-t'], check=True)
    # Verify target identities again after the build, before replacing any service.
    now = inspect(TARGETS)
    assert all(now[name]['Id'] == before[name]['Id'] for name in TARGETS), 'Concurrent deployment detected'
    override = release / 'activation.json'
    override.write_text(json.dumps({'services': {
        'api': {'image': images['api']},
        'web': {'image': images['web'], 'environment': {'API_UPSTREAM': 'mamaison_pilote_api:8080'}}}}))
    try:
        activate(override)
        verified = False
        for attempt in range(18):
            try:
                assert public_json('/release.json')['commit'] == sha
                assert isinstance(public_json('/api/villas')['items'], list)
                assert public_json('/site-config.json')['demo3dEnabled'] is expected_demo
                verified = True
                break
            except Exception:
                time.sleep(5)
        assert verified, 'Public release identity or API health failed'
        after = states(names)
        assert after[TARGETS[0]]['Image'] == images['api'] and after[TARGETS[1]]['Image'] == images['web']
        assert api_mounts == {m['Destination']: m['Source'] for m in inspect(TARGETS)[TARGETS[0]]['Mounts']}
        for name in names:
            if name not in TARGETS:
                assert after[name]['Id'] == before[name]['Id'] and after[name]['RestartCount'] == before[name]['RestartCount'], f'Protected container drift: {name}'
        assert stored_files() == volumes, 'Preserved files changed: investigate before declaring success'
        assert hashlib.sha256((ROOT / '.env.api').read_bytes()).hexdigest() == configuration_hash
        report = {'status': 'DEPLOYED_NOT_VERIFIED', 'commit': sha, 'images': images,
                  'publicIdentityVerified': True, 'volumesPreserved': True, 'otherContainersUnchanged': True,
                  'migrationsApplied': [], 'configurationPreserved': True, 'browserAcceptance': 'pending'}
        (release / 'activation-report.json').write_text(json.dumps(report, indent=2))
        print(json.dumps(report))
    except Exception:
        activate(rollback)
        print('ROLLED_BACK: pilot services restored; SQL and stored files not restored or modified.')
        raise

if __name__ == '__main__':
    main()
