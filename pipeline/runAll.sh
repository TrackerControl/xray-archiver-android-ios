!#/bin/bash

#### DOWNLOADING
python3 nohup ~/python-token-dispenser/token_dispenser.py > ~/python-token-dispenser/token_dispenser.log &
nohup node ./archiver/downloader/downloader.js > ./archiver/downloader/downloader.log &
# nohup node ./archiver/downloader/downloader_ios.js > ./archiver/downloader/downloader_ios.log &

#### ANALYSING
nohup ./analyzer/analyzer -daemon -db > analyzer/analyzer.log &
