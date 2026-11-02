"""Bundle the existing client resource packs; keep Star publications as the top layer."""
from pathlib import Path, PurePosixPath
from hashlib import sha256
import json, sys, zipfile

source = Path(sys.argv[1])
dest = Path(__file__).resolve().parents[1] / 'api/server-resource-pack'
dest.mkdir(parents=True, exist_ok=True)
packs = [
    ('E19 Cobblemon Minimap Icons.zip', '8732ecb1ee0b8cceda4ad973ffcf53e0c6689f503652320107d2569c0cd7f9ba'),
    ('PackPackStar.zip', '32acae22405fe4e5e93f68d60bf76af738fb2a8fea871dfe3e049b7e363fd643'),
    ('NouveauTags.zip', '48f29ffb78d464c5722b11408cef3be6a895639c7e23092d18fe15b99566e0d2'),
]
files, origins, inputs, collisions = {}, {}, [], []
for name, expected in packs:
    raw = (source / name).read_bytes()
    digest = sha256(raw).hexdigest()
    assert digest == expected, name
    # E19 is also checked against its official Modrinth SHA-1.
    if name.startswith('E19'):
        from hashlib import sha1
        assert sha1(raw).hexdigest() == '1aefc7a313b3c6f719d2fa53916afff18cd0792f'
    inputs.append({'name': name, 'sha256': digest, 'bytes': len(raw)})
    with zipfile.ZipFile(source / name) as archive:
        assert archive.testzip() is None
        assert json.loads(archive.read('pack.mcmeta'))['pack']['pack_format'] == 34
        for entry in archive.infolist():
            path = entry.filename
            if entry.is_dir(): continue
            assert not path.startswith('/') and '\\' not in path and '..' not in PurePosixPath(path).parts
            if path.startswith('assets/'):
                if path in files and files[path] != archive.read(entry):
                    collisions.append({'path': path, 'lower': origins[path], 'higher': name})
                files[path] = archive.read(entry)
                origins[path] = name
            elif path.lower().startswith(('license', 'licence', 'credits', 'readme')) or path == 'pack.mcmeta':
                files['licenses/server-pack/' + name.removesuffix('.zip').replace(' ', '-') + '/' + path] = archive.read(entry)
notice = ('CobbleStar - pack serveur unifie, Minecraft Java 1.21.1\n\n'
          'E19 Cobblemon Minimap Icons 1.21.1-1.4.4 : https://modrinth.com/project/Va3BanZa\n'
          'PackPackStar : interfaces Cobblemon inspired GUI, VinnyStalck, avec les visuels CobbleStar existants.\n'
          'NouveauTags : pack de grades CobbleStar existant.\n'
          'Les metadonnees originales de chaque pack sont conservees dans ce dossier.\n'
          'Les publications Star, les grades actuels et les autres ressources CobbleStar sont ajoutes par le serveur en priorite.\n')
files['licenses/server-pack/NOTICE.txt'] = notice.encode()
for data in files.values(): assert len(data) <= 8 * 1024 * 1024
assert len(files) < 16_000 and sum(map(len, files.values())) < 48 * 1024 * 1024
output = dest / 'base.zip'
with zipfile.ZipFile(output.with_suffix('.tmp'), 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for path, data in sorted(files.items()):
        info = zipfile.ZipInfo(path, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, data)
output.with_suffix('.tmp').replace(output)
manifest = {'schema': 1, 'minecraft': '1.21.1', 'packFormat': 34, 'file': 'base.zip',
            'sha256': sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size,
            'entries': len(files), 'uncompressedBytes': sum(map(len, files.values())),
            'inputs': inputs, 'priorityCollisions': collisions}
(dest / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(json.dumps(manifest, ensure_ascii=False, indent=2))
