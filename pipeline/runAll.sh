!#/bin/bash

#### DOWNLOADING
nohup python3 ~/python-token-dispenser/token_dispenser.py > ~/python-token-dispenser/token_dispenser.log &
nohup node ./archiver/downloader/downloader.js > ./archiver/downloader/downloader.log &
# nohup node ./archiver/downloader/downloader_ios.js > ./archiver/downloader/downloader_ios.log &

#### ANALYSING
nohup node ./analyzer_ios/analyzer_ios.js > analyzer_ios/analyzer_ios.log &
nohup ./analyzer/analyzer -daemon -db > analyzer/analyzer.log &
