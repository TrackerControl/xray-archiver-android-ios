package main

import (
	"flag"
	"fmt"
	"log"
	"net/url"
	"os"
//	"sync"
	"time"

	"github.com/sociam/xray-archiver/pipeline/db"
	"github.com/sociam/xray-archiver/pipeline/util"
)

func analyze(app *util.App) error {
	var err error

	// if app.store == "cli" {
	// 	app.dbId, err = db.insertApp(app)
	// 	if err != nil {
	// 		fmt.Printf("Error getting database id of app %s: %s", app.id, err.Error())
	// 	}
	// }

	err = db.SetLastAnalyzeAttempt(app.DBID)
	if err != nil {
		return fmt.Errorf("le cri (failed to set last_analyze_attempt, is the db set up properly?)")
	}

	err = app.Unpack()
	if err != nil {
		fmt.Println()
		fmt.Println(err.Error())
		if os.IsNotExist(err) {
			err := db.UnsetDownloaded(app.DBID)
			if err != nil {
				fmt.Printf("Failed to set %d not downloaded: %s\n", app.DBID, err.Error())
			}
		}
		if err != os.ErrPermission {
			fmt.Printf("Probably failed to unpack because of a crap app: %s\n", app.ID)
		}
		return fmt.Errorf("Error unpacking apk: %s", err.Error())
	}
	fmt.Printf("Unpacked app %s version %s\n", app.ID, app.Ver)

	// fmt.Println("Getting permissions...")
	manifest, gotIcon, err, manifestJson := parseManifest(app)
	if err != nil {
		fmt.Println("Error parsing manifest: ", err.Error())
	} else {
		app.MetaData = manifest.Application.MetaData
		// fmt.Printf("Manifest meta data found: %v\n", app.MetaData)

		app.Components = manifest.getComponents()
		// fmt.Printf("Components found: %v\n", app.Components)

		app.Perms = manifest.getPerms()
		fmt.Printf("Permissions found: %v\n", app.Perms)
		err = db.AddPerms(app)
		if err != nil {
			fmt.Printf("Error writing permissions to DB: %s\n", err.Error())
		}
  		// fmt.Println(manifestJson)
		if manifestJson != "" {
			hasFB, hasFirebase, hasGCM, hasGAds := simpleTrackers(manifestJson)
			fmt.Println("(hasFB, hasFirebase, hasGCM, hasGAds) = ", hasFB, hasFirebase, hasGCM, hasGAds)
			db.SetTrackers(app.DBID, hasFB, hasFirebase, hasGCM, hasGAds)
			db.SetManifest(app.DBID, manifestJson)
		}
		if gotIcon {
			app.Icon = "/" + url.PathEscape(app.ID) + "/" + url.PathEscape(app.Store) +
				"/" + url.PathEscape(app.Region) + "/" + url.PathEscape(app.Ver) + "/icon.png"
			// fmt.Printf("Got icon: %s\n", app.Icon)
			err = db.SetIcon(app.DBID, app.Icon)
			if err != nil {
				fmt.Printf("Error setting icon of app in DB: %s\n", err.Error())
			}
		}
	}

	// fmt.Println("Running simple analysis... ")
	app.Hosts, err = simpleAnalyze(app)
	if err != nil {
		fmt.Printf("Error getting hosts: %s\n", err.Error())
	} else {
		fmt.Printf("Hosts found: %v\n", app.Hosts)

		err = db.AddHosts(app, app.Hosts)
		if err != nil {
			fmt.Printf("Error writing hosts to DB: %s\n", err.Error())
		}
	}

	err = checkReflect(app)
	if err != nil {
		fmt.Printf("Error checking for reflect usage: %s\n", err.Error())
	} else {
		// fmt.Printf("App uses reflect: %v\n", app.UsesReflect)

		err = db.SetReflect(app.DBID, app.UsesReflect)
		if err != nil {
			fmt.Printf("Error writing reflect usage to DB: %s\n", err.Error())
		}
	}

	// app.Packages, err = findPackages(app)
	// if err != nil {
	// 	fmt.Println("Error finding packages: ", err.Error())
	// } else {
	// 	fmt.Println("Packages found: ", app.Packages)
	// 	err = db.AddPackages(app)
	// 	if err != nil {
	// 		fmt.Printf("Error writing packages to DB: %s\n", err.Error())
	// 	}
	// }

	err = db.SetAnalyzed(app.DBID)
	if err != nil {
		fmt.Printf("Error setting analyzed for app %d! This will result in looping!\n", app.DBID)
	}

	err = app.Cleanup()
	if err != nil {
		fmt.Printf("Error removing temp dir: %s", err.Error())
	}

	return nil
}

func worker(id int, jobs <-chan *util.App, results chan<- bool) {
    for app := range jobs {
    	fmt.Println("worker", id, "started  job", app.ID)
        fmt.Printf("Got app %v\n", app)
        err := analyze(app)
    	fmt.Println("worker", id, "finished  job", app.ID)
    	results <- err != nil
    }
}

func runServer() {
	fmt.Println("Checking APK Unpack Directory:", util.Cfg.StorageConfig.APKUnpackDirectory)
	util.CheckDir(util.Cfg.StorageConfig.APKUnpackDirectory, "Unpacked APK directory")

	for {
		const numWorkers = 4
		const numJobs = 10

		jobs := make(chan *util.App, numJobs)
		results := make(chan bool, numJobs)

		for w := 1; w <= numWorkers; w++ {
	        go worker(w, jobs, results)
	    }

		apps, err := db.GetAppsToAnalyze(numJobs)
		if err != nil || len(apps) == 0 {
			if err != nil {
				fmt.Println("Error getting apps to analyze from DB:", err.Error())
			}

			// Got no apps or a DB error occurred, sleep for 30 seconds.
			fmt.Println("Got no apps or errored, sleeping")
			time.Sleep(30 * time.Second)
		}

		// add jobs to queue
	    for _, dbApp := range apps {
    		app := dbApp.UtilApp() // could also be moved into worker..
    	    jobs <- app
	    }
        close(jobs) // indicate that there are no further jobs

        // wait for all jobs to finish..
        for a := 1; a <= numJobs; a++ {
            <-results
        }
	}
}

var cfgFile = flag.String("cfg", "/etc/xray/config.json", "config file location")
var daemon = flag.Bool("daemon", false, "run analyzer as a daemon")
var useDb = flag.Bool("db", false, "add app information to the db specified in the config file")

func init() {
	var err error
	flag.Parse()
	err = util.LoadCfg(*cfgFile, util.Analyzer)
	if err != nil {
		log.Fatalf("Failed to read config: %s", err.Error())
	}
	err = db.Open(util.Cfg, *useDb)
	if err != nil {
		log.Fatalf("Failed to open a connection to the database: %s", err.Error())
	}
}

func main() {
	if err := os.MkdirAll(util.Cfg.StorageConfig.APKUnpackDirectory, 0755); err != nil {
		panic(err)
	}

	if *daemon {
		fmt.Println("Starting xray analyzer daemon")
		runServer()
	} else {
		if flag.NArg() == 0 {
			flag.Usage()
			os.Exit(64)
		}

		for _, appPath := range flag.Args() {
			app := util.AppByPath(appPath)
			app.Store = "cli"
			fmt.Println("Analyzing apk ", appPath)
			analyze(app)
		}
	}
}
