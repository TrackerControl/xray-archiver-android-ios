/*
Analyzer iOS
*/
const path = require('path');
const fs = require('fs-extra');
const logger = require('../util/logger');
const util = require('util');
const bashExec = util.promisify(require('child_process').exec);
const db = new (require('../db/db_ios'))('downloader');
const trackerSignatures = require('./tracker_signatures');

const bufferSize = 1024 * 10000;
const analysisVersion = 5;
const obtainFrameworks = true;

function removeDuplicates(array) {
    return [...new Set(array)];
}

async function getFiles(appPath) {
    const { stdout, stderr } = await bashExec(`unzip -l "${appPath}" | tail -n+4 | head -n-2 | awk '{print substr($0, index($0, $4))}'`, { maxBuffer: bufferSize }); // large buffer
    if (stderr) {
        logger.err(`could obtain file list from ${appPath}. throwing err.`);
        throw stderr;
    }

    return stdout.split('\n').filter(Boolean); // parse, whilst removing empty rows
}

async function analyse(app) {    
    logger.info('Starting analysis attempt for:', app.app);
    await db.updatedAnalyseAttempt(app);

    const appPath = path.join(app.apk_location, `${app.app}.ipa`);

    // Try to obtain list of files in IPA
    let files = app.files;
    if (!files) {
        console.log('Getting file names..');
        files = await getFiles(appPath);
    }
    let fileList = files.join("\n"); // to be able to search over all files

    // This method is very slow. 
    if (!app.frameworks && obtainFrameworks) {
        let frameworks = [];    
        try {
            const appName = fileList.match(/Payload\/([^\/]*?)\.app\/$/m)[1];
            // -UU disables unzip unicode support, which caused problems..
            let command = `unzip -UU -p "${appPath}" "Payload/${appName}.app/${appName}" | strings | grep /System/Library/Frameworks`;
            const { stdout, stderr } = await bashExec(command, { maxBuffer: bufferSize });
            if (stderr) {
                throw stderr;
            }
            const frameworkRegexp = RegExp('\/([^\/]*?)\.framework\/','gm');
            let frameworks = [];
            let frameworkMatch;
            while ((frameworkMatch = frameworkRegexp.exec(stdout)) !== null) {
                frameworks.push(frameworkMatch[1]);
            }
            frameworks = removeDuplicates(frameworks);
            await db.updateAppFrameworks(app, frameworks);
        } catch (ex) {
            logger.err(`could not obtain frameworks from ${appPath}. continuing.`, ex);
        }
    } else {
        console.log('Skipping frameworks.');
    }

    // Scan whole IPA for AdSupport, to check if a subpackage requests AdSupport
    let hasAdId;
    {
        let command = `unzip -UU -p "${appPath}" | grep "ASIdentifierManager\\|AdSupport"`;
        try {
            const { stdout, stderr } = await bashExec(command, { maxBuffer: bufferSize });
            hasAdId = true;
        } catch (ex) {
            hasAdId = false;
        }

        if (hasAdId && app.frameworks && !app.frameworks.includes("AdSupport") && !app.frameworks.includes("AdSupport_Subpackage")) {
            app.frameworks.push("AdSupport_Subpackage");
            console.log('############################# FOUND ADID in SUBPACKAGE');
            await db.updateAppFrameworks(app, app.frameworks);
        }
    }

    // Check what bundles the app contains
    const regexp = RegExp('\/([^\/]*?\.bundle)\/$','gm');
    let bundles = [];
    let match;
    while ((match = regexp.exec(fileList)) !== null) {
        bundles.push(match[1]);
    }

    // Read Info.plist.json, which was extracted from .ipa in the iOS downloader
    let manifestJson, manifest;
    if (!app.manifest) {
        const manifestPath = path.join(app.apk_location, `${app.app}.plist.json`);
        manifestJson = fs.readFileSync(manifestPath).toString();
        manifest = JSON.parse(manifestJson);
    } else {
        manifest = app.manifest;
        manifestJson = JSON.stringify(manifest);
    }

    // Check trackers against known signatures
    let trackers = [];
    trackerSignatures.manifest.forEach(signature => {
        if (manifestJson.includes(signature.signature))
            trackers.push(signature.name);
    });
    trackerSignatures.files.forEach(signature => {
        if (fileList.includes(signature.signature))
            trackers.push(signature.name);
    });
    trackerSignatures.bundles.forEach(signature => {
        if (bundles.includes(signature.signature))
            trackers.push(signature.name);
    });
    trackers = removeDuplicates(trackers);
    
    // Check if the app uses any tracking settings
    let trackerSettings = [];
    trackerSignatures.settings.forEach(setting => {
        if (manifest[setting.signature] === setting.value)
            trackerSettings.push(setting.name);
    });

    // Detect permissions
    let permissions = [];
    trackerSignatures.permissions.forEach(signature => {
        if (manifest[signature.signature])
            permissions.push(signature.name);
    });

    await db.updateAppAnalysis(app, files, manifestJson, trackers, trackerSettings, bundles, permissions, analysisVersion);
}

function getWorkerDetails() {
    let args = process.argv.slice(2);
    let workerNumber = args[0];
    let workerTotal = args[1];
    let isWorker = workerNumber !== undefined
                    && workerTotal !== undefined

    return { isWorker, workerNumber, workerTotal };
}

async function main() {
    let { isWorker, workerNumber, workerTotal } = getWorkerDetails();
    console.log('isWorker', isWorker, 'workerNumber', workerNumber, 'workerTotal', workerTotal);

    for (;;) {
        let apps;
        try {
            apps = await db.queryAppsToAnalyse(1000, analysisVersion);
        } catch (err) {
            console.log('Waiting for 60');
            await new Promise((resolve) => setTimeout(resolve, 60000));
            continue;
        }

        for (const app of apps ) {
            if (isWorker && app.id % workerTotal != workerNumber) {
                console.log('Skipping app ' + app.id);
                continue;
            }

            try {
                await analyse(app).catch((err) => {
                    throw err;
                });
            } catch (err) {
                logger.err(
                    `Error Analysing application with package name: ${app.app}.`,
                    `Error: ${err}`
                );
            }
        }
    }
}

main();
