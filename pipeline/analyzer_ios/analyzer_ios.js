/*
Download process spawner
*/
const path = require('path');
const fs = require('fs-extra');
const logger = require('../util/logger');
const util = require('util');
const bashExec = util.promisify(require('child_process').exec);
const db = new (require('../db/db_ios'))('downloader');

async function analyse(app) {
    logger.info('Starting analysis attempt for:', app.app);
    await db.updatedAnalyseAttempt(app);

    const appPath = path.join(app.apk_location, `${app.app}.ipa`);

    // Try to obtain list of files in IPA
    const { stdout, stderr } = await bashExec(`unzip -l ${appPath} | tail -n+4 | awk -v col=4 '{print $col}'`);
    if (stderr) {
        logger.err(`could not parse app at ${appPath}. throwing err.`);
        throw stderr;
    }

    // Parse list of filenames, whilst removing empty rows
    let files = stdout.split('\n').filter(Boolean);
    //await db.updateAppFiles(app, files);

    // Read Info.plist.json, which was extracted from .ipa in the iOS downloader
    const manifestPath = path.join(app.apk_location, `${app.app}.plist.json`);
    const manifestJson = fs.readFileSync(manifestPath).toString();
    const manifest = JSON.parse(manifestJson);
    //await db.updateAppManifest(app, manifestJson);

    let hasFB = manifestJson.includes('FacebookAppID');
    let hasFirebase = stdout.includes('GoogleService-Info.plist');
    let hasGAds = manifestJson.includes('GADApplicationIdentifier');
    console.log('(hasFB, hasFirebase, hasGAds) = ', hasFB, hasFirebase, hasGAds);
    //await db.updateAppTrackers(app, hasFB, hasFirebase, hasGAds);

    //await db.updateAppAnalysed(app);

    // fast updates, in one step to avoid breakage
    await db.updateAppAnalysis(app, files, manifest, hasFB, hasFirebase, hasGAds);
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
            apps = await db.queryAppsToAnalyse(1000);
        } catch (err) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
        }

        for (const app of apps ) {
            if (isWorker && app.id % workerTotal != workerNumber) {
                console.log('Skipping app ' + app.id);
                continue;
            }

            try {
                console.log(app);
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
