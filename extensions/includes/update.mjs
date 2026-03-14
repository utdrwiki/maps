import { httpGet } from "./api.mjs";
import { areAutoUpdateChecksDisabled, storeAutoUpdateChecksDisabled } from "./session.mjs";

// Conflict with the DOM File type.
const TiledFile = /** @type {any} */ (File);

function isGit() {
    const p = new Process();
    p.workingDirectory = tiled.project.extensionsPath;
    const status = p.exec('git', ['status'], false);
    return status === 0;
}

function pullGit() {
    const p = new Process();
    p.workingDirectory = tiled.project.extensionsPath;
    const status = p.exec('git', ['pull'], false);
    if (status !== 0) {
        tiled.alert(`Failed to pull updates from Git: ${p.readStdErr()}`);
    } else {
        tiled.log(p.readStdOut());
    }
}

/**
 * Recursively retrieves all files in a directory and its subdirectories that
 * are relevant to the update process.
 * @param {string} dir Directory to inspect for files
 * @param {string[]} prefix Base directory for relative paths
 * @returns {Record<string, string>}
 */
function getAllUpdaterFiles(dir, prefix = []) {
    const /** @type {Record<string, string>} */ files = {};
    for (const fileName of TiledFile.directoryEntries(dir, 2, 0)) {
        if (!fileName.endsWith('.mjs')) {
            continue;
        }
        const file = new TextFile(`${dir}/${fileName}`, TextFile.ReadOnly);
        files[[...prefix, fileName].join('/')] = file.readAll();
        file.close();
    }
    for (const directory of TiledFile.directoryEntries(dir, 24577, 0)) {
        Object.assign(files, getAllUpdaterFiles(directory, [...prefix, directory]));
    }
    return files;
}

function update() {
    if (areAutoUpdateChecksDisabled()) {
        return;
    }
    const scriptPath = FileInfo.joinPaths(tiled.project.extensionsPath, 'includes');
    const localFiles = getAllUpdaterFiles(scriptPath);
    httpGet('https://maps.undertale.wiki/bundle.json').then(bundle => {
        const onlyLocalFiles = Object.keys(localFiles).filter(path => !(path in bundle));
        const diffFiles = Object.entries(bundle).filter(([path, content]) => {
            const filePath = FileInfo.joinPaths(scriptPath, path);
            if (!TiledFile.exists(filePath)) {
                return true;
            }
            const file = new TextFile(filePath, TextFile.ReadOnly);
            const localContent = file.readAll();
            file.close();
            return localContent !== content;
        });
        if (onlyLocalFiles.length === 0 && diffFiles.length === 0) {
            tiled.log('Extension is up to date.');
            return;
        }
        if (isGit()) {
            if (tiled.confirm('Updates are available for the wiki extension, but you are using Git. Do you want to run git pull?')) {
                pullGit();
            }
            return;
        }
        if (!tiled.confirm(`Updates are available for the wiki extension! Do you want to update now?`)) {
            return;
        }
        for (const path of onlyLocalFiles) {
            TiledFile.remove(FileInfo.joinPaths(scriptPath, path));
        }
        for (const [path, content] of diffFiles) {
            const filePath = FileInfo.joinPaths(scriptPath, path);
            const file = new TextFile(filePath, TextFile.WriteOnly);
            file.write(content);
            file.commit();
        }
        tiled.alert('Extension updated successfully! Please restart Tiled to apply the updates.');
    }).catch(error => {
        tiled.alert(`Failed to check for updates: ${error.message}. Check the console for more details.`);
        tiled.log(`Error details: ${error.stack}`);
    });
}

const enablePopup = tiled.registerAction('WikiDisableUpdateChecks', () => {
    storeAutoUpdateChecksDisabled(enablePopup.checked);
});
enablePopup.checkable = true;
enablePopup.checked = areAutoUpdateChecksDisabled();
enablePopup.iconVisibleInMenu = false;
enablePopup.text = 'Wiki: Disable update checks';

tiled.extendMenu('Help', [
    {
        action: 'WikiDisableUpdateChecks'
    }
]);

update();
