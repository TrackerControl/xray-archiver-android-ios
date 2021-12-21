# X-Ray Archiver

Project for the archiving of mobile applications from the Google Play Store and the Apple App Store.

Stores Application metadata and files, and provides a server API to access the results from outside.

## Software Components

Note: If you want to keep services running on your server, even after exiting your terminal session, start tasks with `nohup` as follows:

```bash
nohup node pipeline/archiver/explorer/explorer.js > explorer.log &
```

### Search Term Explorer
The `Search Term Explorer` generates search terms that can be used by the `App Metadata Retriever` for fetching app meta data from the Google and Apple app stores.

It relies on the [Google Play Scraper](https://github.com/facundoolano/google-play-scraper) and the [App Store Scraper](https://github.com/facundoolano/app-store-scraper).

The search terms generated are auto-completion suggestions made by the app stores.

In other words, search terms used by the retreiver lead to popular apps searched by users.

```bash
node pipeline/archiver/explorer/explorer[_ios].js
```

### App Metadata Retriever

NodeJS Script for the retrieval of Data relating to mobile applications found on the Google and Apple app stores.

The script relies on the existence of search terms in the database.

This script utilises the [Google Play Scraper](https://github.com/facundoolano/google-play-scraper) and the [App Store Scraper](https://github.com/facundoolano/app-store-scraper).

```bash
node pipeline/archiver/retriever/retriever[_ios].js
```

### App Downloader

#### Android
The `App Downloader` fetches Android and Apple app files using the app data that has been collected by the `App Metadata Retriever`.

The script utilises the `GPlayCli` for connecting to the app stores for downloading app files.

For Android app downloading, first start python-token-dispenser with:

```bash
python3 token_dispenser.py &
```

You then should attempt to unlock your Google account, by visiting https://accounts.google.com/b/0/DisplayUnlockCaptcha with the IP address that is used for crawling.

You can check that everything is working fine by running:

```bash
gplaycli -d com.facebook.katana -c /etc/xray/credentials.json -v -p -t
```

Then, you can start downloading with:

```bash
node pipeline/archiver/downloader/downloader.js
```

#### iOS
For downloading iOS apps, use our App Store Downloader from <https://github.com/OxfordHCC/app-store-downloader>.

This requires a dedicated Windows machine.

In addition, you may want to add a script to upload the downloaded apps from Windows automatically to your X-Ray instance.

An example bash script could look as follows:
```
#!/bin/bash

IPA_FOLDER=C:/Users/Konrad/Music/iTunes/iTunes\ Media/Downloads

while true
do
	rsync -vz --remove-source-files -e ssh $IPA_FOLDER/*.ipa konrad@fs2:/c/apps/2020/upload
	sleep 2
done
```
Note that this requires the ability to run bash scripts under Windows.

Afterwards, you can import the uploaded apps from `/c/apps/2020/upload` (in the example) into your X-Ray instance by running
```bash
node pipeline/archiver/downloader/downloader_ios.js
```

### Database

A Postgres database contains a series of tables required by all elements of the project.

Tables for search term data and app meta data are required for each script to function correctly.

An `init_db[_ios].sql` file located in the db folder of this project can be used to initial a postgres database (see section  `Installation`).

### API Server
An API server has been developed to allow others to interface with the data collected and generated. Information regarding this API can be found in the [API ReadMe](https://github.com/sociam/xray-archiver/tree/develop/pipeline/apiserv).

## Installation (on Ubuntu 18.04)

- Install npm

```bash
sudo apt install nodejs npm
```

- Install Go

```bash
sudo add-apt-repository ppa:gophers/archive
sudo apt-get update
sudo apt-get install golang-1.11-go

echo 'export PATH=/usr/lib/go-1.11/bin:$PATH' >> ~/.bashrc 
echo 'export GOPATH=$HOME/gocode' >> ~/.bashrc 
```

- Install postgresql and create xray database

```bash
sudo apt install postgresql
sudo -u postgres psql -c "CREATE DATABASE xraydb"
sudo -u postgres psql xraydb < init_db.sql
sudo -u postgres psql xraydb < init_db_ios.sql
```

- You may have to change your database permissions in your `/etc/postgresql/*/main/pg_hba.conf`

- Install node packages

```bash
npm install -g google-play-scraper pg
```

- Install `exodus-standalone`, as described at <https://github.com/Exodus-Privacy/exodus-standalone>. Then, update `exodus_path` in your `/etc/xray/config.json`

- Create xray configuration files (and fill in your details)

```bash
sudo mkdir /etc/xray
sudo cp $GOPATH/src/github.com/OxfordHCC/xray-archiver-android-ios/pipeline/config/example_config.json /etc/xray/config.json
sudo cp $GOPATH/src/github.com/OxfordHCC/xray-archiver-android-ios/pipeline/config/example_config.json /etc/xray/config_ios.json
```

- Download and compile source

```bash
go get github.com/OxfordHCC/xray-archiver-android-ios/pipeline
cd $GOPATH/src/github.com/OxfordHCC/xray-archiver-android-ios/pipeline
./scripts/install.sh
```

- Set up token dispenser

```bash
git clone https://github.com/kasnder/python-token-dispenser
```

- Now, put Goole credentials into your `python-token-dispenser/passwords/passwords.txt`
- Install modified gplaycli

```bash
git clone https://github.com/kasnder/gplaycli && pip3 install ./gplaycli/
sudo cp $GOPATH/src/github.com/OxfordHCC/xray-archiver-android-ios/pipeline/config/example_credentials.json /etc/xray/credentials.json
```

- Install apktool according to the instructions at <https://ibotpeaches.github.io/Apktool/install/>

- Install unzip, for iOS Analyzer

```bash
sudo apt install unzip
```

## Citation

If you use this project as part of your academic studies, please kindly cite the below articles:

```
@article{kollnig2022_iphone_android,
      title={Are iPhones Really Better for Privacy? A Comparative Study of iOS and Android Apps}, 
      author={Konrad Kollnig and Anastasia Shuba and Reuben Binns and Max {Van Kleek} and Nigel Shadbolt},
      year={2022},
      journal={Proceedings on Privacy Enhancing Technologies}
}

@article{kollnig_before_2021,
  title = {Before and after {{GDPR}}: Tracking in Mobile Apps},
  shorttitle = {Before and after {{GDPR}}},
  author = {Kollnig, Konrad and Binns, Reuben and {Van Kleek}, Max and Lyngs, Ulrik and Zhao, Jun and Tinsman, Claudine and Shadbolt, Nigel},
  year = {2021},
  journaltitle = {Internet Policy Review},
  volume = {10},
  number = {4},
  issn = {2197-6775},
  doi = {10.14763/2021.4.1611}
}

@inbook{10.1145/3173574.3173967,
	author = {Van Kleek, Max and Binns, Reuben and Zhao, Jun and Slack, Adam and Lee, Sauyon and Ottewell, Dean and Shadbolt, Nigel},
	title = {X-Ray Refine: Supporting the Exploration and Refinement of Information Exposure Resulting from Smartphone Apps},
	year = {2018},
	isbn = {9781450356206},
	publisher = {Association for Computing Machinery},
	address = {New York, NY, USA},
	url = {https://doi.org/10.1145/3173574.3173967},
	pages = {1–13},
	numpages = {13}
}

@inproceedings{10.1145/3201064.3201089,
	author = {Binns, Reuben and Lyngs, Ulrik and Van Kleek, Max and Zhao, Jun and Libert, Timothy and Shadbolt, Nigel},
	title = {Third Party Tracking in the Mobile Ecosystem},
	year = {2018},
	isbn = {9781450355636},
	publisher = {Association for Computing Machinery},
	address = {New York, NY, USA},
	url = {https://doi.org/10.1145/3201064.3201089},
	doi = {10.1145/3201064.3201089},
	booktitle = {Proceedings of the 10th ACM Conference on Web Science},
	pages = {23–31},
	numpages = {9},
	keywords = {mobile, data protection, behavioural advertising, static analysis, privacy, tracking, android},
	location = {Amsterdam, Netherlands},
	series = {WebSci '18}
}

@inbook{10.1145/3025453.3025556,
	author = {Van Kleek, Max and Liccardi, Ilaria and Binns, Reuben and Zhao, Jun and Weitzner, Daniel J. and Shadbolt, Nigel},
	title = {Better the Devil You Know: Exposing the Data Sharing Practices of Smartphone Apps},
	year = {2017},
	isbn = {9781450346559},
	publisher = {Association for Computing Machinery},
	address = {New York, NY, USA},
	url = {https://doi.org/10.1145/3025453.3025556},
	booktitle = {Proceedings of the 2017 CHI Conference on Human Factors in Computing Systems},
	pages = {5208–5220},
	numpages = {13}
}
```

