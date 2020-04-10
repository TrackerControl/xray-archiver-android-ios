/*
Download process spawner
*/
const path = require('path');
const logger = require('../util/logger');
const util = require('util');
const bashExec = util.promisify(require('child_process').exec);
const db = new (require('../db/db'))('downloader');
const trackerSignatures = require('./tracker_signatures');

const bufferSize = 1024 * 10000;
const analysisVersion = 4;

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
    let manifestJson = JSON.stringify(app.manifest);

    // Try to obtain list of files in IPA
    const appPath = path.join(app.apk_location, `${app.app}.apk`);
    let files = app.files;
    if (!files) {
        console.log('Getting file names..');
        files = await getFiles(appPath);
    }
    let fileList = files.join("\n"); // to be able to search over all files

    // Detect trackers
    let trackers = [];
    trackerSignatures.manifest.forEach(signature => {
        if (manifestJson.includes(signature.signature))
            trackers.push(signature.name);
    });
    trackerSignatures.files.forEach(signature => {
        if (fileList.includes(signature.signature))
            trackers.push(signature.name);
    });
    trackers = removeDuplicates(trackers);

    let hasFB = trackers.includes('FB');
    let hasFirebase = trackers.includes('Firebase');
    let hasGAds = trackers.includes('GAdMob');
    let hasGCM = trackers.includes('GCM');

    // Check if the app uses any tracking settings
    let metaData = app.manifest['manifest']['application']['meta-data'];
    let trackerSettings = [];
    if (metaData) {
        // object instead of array?
        if (!Array.isArray(metaData))
            metaData = [metaData];

        trackerSignatures.settings.forEach(setting => {
            metaData.forEach(metaDatum => {
                if (metaDatum['-name'] == setting.signature
                    && metaDatum['-value'] === setting.value)
                trackerSettings.push(setting.name);
            });
        });
    }
    await db.updateAppAnalysis(app, trackers, trackerSettings, hasFB, hasFirebase, hasGAds, hasGCM, files, analysisVersion);
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
