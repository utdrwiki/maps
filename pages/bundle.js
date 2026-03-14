import {readdir, readFile, writeFile} from 'fs/promises';
import {join} from 'path';
import {fileURLToPath} from 'url';

const bundle = {};
const scriptDir = join(fileURLToPath(import.meta.url), '..');
const extensionsDir = join(scriptDir, '..', 'extensions');
for (const dir of await readdir(extensionsDir, {
    recursive: true,
    withFileTypes: true,
})) {
    if (dir.isFile() && (dir.name.endsWith('.mjs') || dir.name.endsWith('.svg'))) {
        const filePath = join(dir.parentPath, dir.name);
        const content = await readFile(filePath, 'utf-8');
        const relativePath = filePath.slice(extensionsDir.length + 1);
        bundle[relativePath] = content;
    }
}
await writeFile(join(scriptDir, 'bundle.json'), JSON.stringify(bundle));
