/*
Download process spawner
*/

const config = require('/etc/xray/config_ios.json');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../../util/logger');
const util = require('util');
const bashExec = util.promisify(require('child_process').exec);
const db = new (require('../../db/db_ios'))('downloader');

const plistParser = require('plist');
const unzip = require('unzipper');

const uploadPath = "/var/xray/apps/upload/";

async function ensureDirectoriesExist(directories) {
    const validDirectories = [];
    for (const dir of directories) {
        try {
            await fs.ensureDir(path.join(dir.path, 'apps'));
            validDirectories.push(dir);
        } catch (err) {
            logger.err(
                `
                Error ensuring directory '${dir.path}' exists.
                Error: ${err}.
                Exluding ${dir.name} at ${dir.path} from the download location options.
                `
            );
        }
    }
    return validDirectories;
}

function mkdirp(dir) {
    dir.split(path.sep).reduce((parentDir, childDir) => {
        const curDir = path.join(parentDir, childDir);
        if (!fs.existsSync(curDir)) {
            fs.mkdirSync(curDir);
        }
        return curDir;
    }, path.isAbsolute(dir) ? path.sep : '');
}

function parseDFOutputForFirstFS(fsString) {
    const fsLines = fsString.split('\n').filter((part) => part != '');
    return fsLines[1].split(' ')[0];
}

function parseDFOutputToJSON(fsString) {
    const fsLines = fsString.split('\n').filter((part) => part != '');
    const header = fsLines[0].split(' ').filter((part) => part != '');
    const fileSystems = fsLines.slice(1);
    const parsedOutput = {};
    for (const fs of fileSystems) {
        const lineParts = fs.split(' ').filter((part) => part != '');
        parsedOutput[lineParts[0]] = {};
        for (let i=1; i < header.length; i++) {
            if (lineParts[i]) {
                parsedOutput[lineParts[0]][header[i].toLowerCase()] = lineParts[i];
            }
        }
    }
    return parsedOutput;
}

async function getUUID(devicePath) {
    // Can use df to get the filesystem and mounted on path.
    //      df -BG /dev/disk/by-uuid/5D3E-D824
    //      Filesystem     1G-blocks  Used Available Use% Mounted on
    //      /dev/sdc1            58G   14G       44G  24% /mnt/sanDiskUSB
    if (devicePath = "overlay") // UUID does not exist for docker filesystem
        return "docker"
    
    try {
        const { stdout, stderr } = await bashExec(`sudo blkid -s UUID -o value ${devicePath}`);
        if (stderr) {
            logger.err(`blkid wrote to STDERR: ${stderr}`);
            throw stderr;
        }
        return stdout;
    } catch (err) {
        logger.err(`Error getting UUID for ${devicePath} using 'blkid'. Error: ${err}`);
        return err;
    }
}

async function df(path='') {
    const { stdout, stderr } = await bashExec(`df ${path} -BG`);
    if (stderr) {
        logger.err('getDiskSpace: df wrote to stderr. throwing err.');
        throw stderr;
    }
    return { stdout, stderr };
}

async function getPathFileSystem(path) {
    try {
        const { stdout, stderr } = await df(path);
        if (stderr) {
            throw stderr;
        }
        return parseDFOutputForFirstFS(stdout);
    } catch (err) {
        logger.err(`Error getting the Filesystem containing ${path}. Error: ${err}`);
        return err;
    }
}
async function getAvailableDiskSpace(path) {
    logger.debug(`Using 'df' to get the filesystem space for the filesystem containing '${path}'`);
    try {
        const { stdout, stderr } = await df(path);
        const dfJSON = parseDFOutputToJSON(stdout);
        const fs = parseDFOutputForFirstFS(stdout);
        if (stderr) {
            throw stderr;
        }
        return parseInt(dfJSON[fs]['available'].replace('G', ''));
    } catch (err) {
        logger.err(`Error getting the filesystem space for filesystem containing ${path}.
        Error: ${err}`);
        return err;
    }
}

async function getLocationWithLeastSpace() {
    logger.debug('Getting Save Location with the lowest amount of Space.');
    downloadLocations = await ensureDirectoriesExist(
        config.storage_config.app_download_directories
    );
    const dirSpaces = [];
    for (const dir of downloadLocations) {
        dirSpaces.push({
            name: dir.name,
            path: dir.path,
            available: await getAvailableDiskSpace(dir.path),
        });
    }

    const dirsWithSomeSpace = dirSpaces.filter((dir) => {
        return dir.available >= config.storage_config.minimum_gb_required;
    });

    if(dirsWithSomeSpace.length == 0) {
        var err = new Error(
            'NoDiskspaceError: No disks exist that have space available.',
            '\nMinimum Space Required:',
            config.storage_config.minimum_gb_required,
            'Disks Checked:',
            dirSpaces
        )
        logger.err(err);
        process.exit(-1);
    }

    return dirsWithSomeSpace.sort((a, b) => {
        return a.available > b.available ? 1 : -1;
    })[0];
}

async function resolveAppSaveInfo(appData) {
    const appsSaveDir = await getLocationWithLeastSpace();
    const filesystem = await getPathFileSystem(appsSaveDir.path);
    const UUID = await getUUID(filesystem);

    logger.debug(`appdir: ${appsSaveDir.path} - space remaining: ${appsSaveDir.available}`,
        `\nappId ${appData.app}`, `\nappStore ${appData.store}`,
        `\nregion ${appData.region}`, `\nversion ${appData.version}`);

    const appSavePath = path.join(appsSaveDir.path, 'apps', ...appData.app.split("."),
        appData.store, appData.region, appData.version);
    logger.info(`App Save Directory formed: '${appSavePath}'`);

    await mkdirp(appSavePath);

    return {
        appSavePath: appSavePath,
        appSaveFS: filesystem,
        appSaveFSName: appsSaveDir.name,
        appSavePathRoot: appsSaveDir.path,
        appSaveUUID: UUID,
    };
}

async function move(app) {
    logger.info('Starting moving attempt for:', app.app);

    db.updatedDlAttempt(app); // update DB that iOS app was attempted to be downloaded
    let appSaveInfo;
    try {
        appSaveInfo = await resolveAppSaveInfo(app);
    } catch (err) {
        await new Promise((resolve) => setTimeout(resolve, 6000));
        return Promise.reject(`Did not have access to resolve dir: ${err.message}`);
    }

    try {
        await fs.writeFile(appSaveInfo.appSavePath + '/' + app.app + '.plist', app.plist);
        await fs.writeFile(appSaveInfo.appSavePath + '/' + app.app + '.plist.json', JSON.stringify(app.parsedPlist));
        await fs.rename(app.filename, appSaveInfo.appSavePath + '/' + app.app + '.ipa');
    } catch (err) {
        logger.debug('Attempting to remove created dir');
        await fs.rmdir(appSaveInfo.appSavePath).catch(logger.warning);
        return Promise.reject(`Moving failed with err: ${err}`);
    }

    try {
        const appPath = path.join(appSaveInfo.appSavePath, `${app.app}.ipa`);

        if (fs.existsSync(appPath)) {
            // Perform a check on ipa size
            await fs.stat(appPath, async(err, stats) => {
                if (stats.size == 0 || stats.size == undefined) {
                    await fs.rmdir(appSaveInfo.appSavePath).catch(logger.warning);
                    return Promise.reject('File did not successfully download and is a empty size');
                }

                await db.updateDownloadedApp(app, appSaveInfo, config.system_config.vm_name);
                return undefined;
            });
        }
    } catch (err) {
        // TODO: Maybe do something else? Destroying process as we have apps that
        // don't exist in db...
        return Promise.reject('Err when updated the downloaded app', err);
    }
    return undefined;
}

async function main() {
    // Ensure that directory structures exist.
    downloadLocations = await ensureDirectoriesExist(
        config.storage_config.app_download_directories
    );

    // loops over all recently downloaded iOS apps (from iOS crawler), and integrates them into the x-ray filesystem
    for (;;) {
        let filenames = [];

        let files = fs.readdirSync(uploadPath);        
        files.forEach(file => {
            let filename = uploadPath + file;
            if (!filename.endsWith(".ipa"))
                return;        
            filenames.push(filename);
        });

        for (let filename of filenames) {
            let raw = ''; // stores the iOS manifest file in plist format, extracted from the ipa

            // use promise to be able to wait for end of data operation
            await new Promise((resolve, reject) => {
                fs.createReadStream(filename)

                .pipe(unzip.ParseOne(/^Payload\/[^\/]+.app\/Info.plist$/))

                .on('data', (chunk) => {
                    raw += chunk;
                })

                .on('end', async () => {
                    try {
                       let plist = plistParser.parse(raw);

                       let app = {                       
                           'app': plist.CFBundleIdentifier,
                           'version': plist.CFBundleShortVersionString,
                           'store': 'ios',
                           'region': 'gb',
                           'plist': raw,
                           'parsedPlist': plist,
                           'filename': filename
                       };

                       try {
                           await move(app).catch((err) => {
                               throw err;
                           });
                           return resolve(app);
                       } catch (err) {
                           logger.err(
                               `Error Moving application with package name: ${app.app}.`,
                               `Error: ${err}`
                           );
                           return reject(err);
                       }
                   } catch (err) {
                       logger.err(`Failure parsing ${filename}: ${err}`);
                       return reject(err);
                   }            
                })

                .on('error', (err) => {
                    logger.err(`Error ${filename}: ${err}`);
                    return reject(err);
                });
            }).catch(err => console.log("Caught error. Continuing.."));
        }
    }
}

main();
