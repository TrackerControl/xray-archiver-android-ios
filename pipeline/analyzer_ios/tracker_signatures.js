const manifest = [ 
                   { signature: 'GADApplicationIdentifier', name: 'GAdMob'},
                   { signature: 'GADIsAdManagerApp', name: 'GAd Manager'},
                   { signature: 'FacebookAppID', name: 'FB'},
                   { signature: 'AppLovinSdkKey', name: 'AppLovin'},
                   { signature: 'branch_key', name: 'branch.io'},
                   { signature: 'Fabric', name: 'Fabric'},
                   { signature: 'MOBAppKey', name: 'ShareSDK'},
                   { signature: 'MOBAppSecret', name: 'ShareSDK'},
                   { signature: 'com.appsee.ApiKey', name: 'Appsee'},
                   { signature: 'com.openinstall.APP_KEY', name: 'openinstall'},
                   { signature: 'Unity_LoadingActivityIndicatorStyle', name: 'Unity'},
                   { signature: 'UnityCloudProjectID', name: 'Unity'},
                   { signature: 'UnityCrashSubmissionURL', name: 'Unity'},
                   { signature: 'IntuneMAMSettings', name: 'Microsoft Intune'},
                   { signature: 'appcenter-', name: 'Microsoft App Center'}, // not a tag, URL scheme
                   { signature: 'twitterkit-', name: 'Twitter'}, // not a tag, URL scheme
                 ];

const bundles = [ { signature: 'HockeySDKResources.bundle', name: 'HockeyApp'} ]

const files    = [ { signature: 'GoogleService-Info.plist', name: 'Firebase'},
                   { signature: 'ADBMobileConfig.json', name: 'Adobe'},
                   { signature: 'amplifyconfiguration.json', name: 'Amazon'},
                   { signature: 'awsconfiguration.json', name: 'Amazon'}];

const settings = [ 
                   { signature: 'GADDelayAppMeasurementInit', name: 'GAds_Init_Delayed', value: true },
                   { signature: 'FacebookAutoLogAppEventsEnabled', name: 'FB_Events_Delayed', value: false },
                   { signature: 'FacebookAutoInitEnabled', name: 'FB_Init_Delayed', value: false },
                   { signature: 'FacebookAdvertiserIDCollectionEnabled', name: 'FB_ADID_Disabled', value: false },
                   { signature: 'FirebaseMessagingAutoInitEnabled', name: 'Firebase_Messaging_Delayed', value: false },
                   { signature: 'FIREBASE_ANALYTICS_COLLECTION_ENABLED', name: 'Firebase_Analytics_Disabled', value: false },
                   { signature: 'FIREBASE_ANALYTICS_COLLECTION_DEACTIVATED', name: 'Firebase_Analytics_Deactivated', value: true },
                   { signature: 'GOOGLE_ANALYTICS_IDFV_COLLECTION_ENABLED', name: 'Firebase_IDFV_Disabled', value: false },
                   { signature: 'GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_PERSONALIZATION_SIGNALS', name: 'Firebase_Analytics_Ads_Disabled', value: false },
                   { signature: 'NSAllowsArbitraryLoads', name: 'NSAllowsArbitraryLoads', value: true }
                 ];

const permissions = [
                    {signature: 'NSPhotoLibraryUsageDescription', name:'PhotoLibraryUsage'},
                    {signature: 'NSCameraUsageDescription', name:'CameraUsage'},
                    {signature: 'NSLocationWhenInUseUsageDescription', name:'LocationWhenInUseUsage'},
                    {signature: 'NSLocationAlwaysUsageDescription', name:'LocationAlwaysUsage'},
                    {signature: 'NSPhotoLibraryAddUsageDescription', name:'PhotoLibraryAddUsage'},
                    {signature: 'NSMicrophoneUsageDescription', name:'MicrophoneUsage'},
                    {signature: 'NSCalendarsUsageDescription', name:'CalendarsUsage'},
                    {signature: 'NSLocationAlwaysAndWhenInUseUsageDescription', name:'LocationAlwaysAndWhenInUseUsage'},
                    {signature: 'NSContactsUsageDescription', name:'ContactsUsage'},
                    {signature: 'NSBluetoothPeripheralUsageDescription', name:'BluetoothPeripheralUsage'},
                    {signature: 'NSLocationUsageDescription', name:'LocationUsage'}, // DEPRECATED
                    {signature: 'NSMotionUsageDescription', name:'MotionUsage'},
                    {signature: 'NSAppleMusicUsageDescription', name:'AppleMusicUsage'},
                    {signature: 'NSBluetoothAlwaysUsageDescription', name:'BluetoothAlwaysUsage'},
                    {signature: 'NSFaceIDUsageDescription', name:'FaceIDUsage'},
                    {signature: 'NSRemindersUsageDescription', name:'RemindersUsage'},
                    {signature: 'NSSpeechRecognitionUsageDescription', name:'SpeechRecognitionUsage'},
                    {signature: 'NSHealthUpdateUsageDescription', name:'HealthUpdateUsage'},
                    {signature: 'NSHealthShareUsageDescription', name:'HealthShareUsage'},
                    {signature: 'NSSiriUsageDescription', name:'SiriUsage'},
                    {signature: 'NFCReaderUsageDescription', name:'NFCReaderUsage'},
                    {signature: 'NSHomeKitUsageDescription', name:'HomeKitUsage'},
                    {signature: 'NSUserTrackingUsageDescription', name:'Tracking'}
                   ];

module.exports = { manifest: manifest, files: files, settings: settings, bundles: bundles, permissions: permissions };
