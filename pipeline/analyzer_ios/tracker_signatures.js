const manifest = [ { signature: 'GADApplicationIdentifier', name: 'GAds'},
                   { signature: 'FacebookAppID', name: 'FB'},
                   { signature: 'Crashlytics', name: 'Fabric'}];

const files    = [ { signature: 'GoogleService-Info.plist', name: 'Firebase'} ];

const settings = [ { signature: 'GADDelayAppMeasurementInit', name: 'GAds_Init_Delayed', value: true },
                   { signature: 'FacebookAutoLogAppEventsEnabled', name: 'FB_Events_Delayed', value: false },
                   { signature: 'FacebookAutoInitEnabled', name: 'FB_Init_Delayed', value: false },
                   { signature: 'FacebookAdvertiserIDCollectionEnabled', name: 'FB_ADID_Disabled', value: false },
                   { signature: 'FirebaseMessagingAutoInitEnabled', name: 'Firebase_Messaging_Delayed', value: false },
                   { signature: 'FIREBASE_ANALYTICS_COLLECTION_ENABLED', name: 'Firebase_Analytics_Disabled', value: false },
                   { signature: 'FIREBASE_ANALYTICS_COLLECTION_DEACTIVATED', name: 'Firebase_Analytics_Deactivated', value: true },
                   { signature: 'GOOGLE_ANALYTICS_IDFV_COLLECTION_ENABLED', name: 'Firebase_IDFV_Disabled', value: false },
                   { signature: 'GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_PERSONALIZATION_SIGNALS', name: 'Firebase_Analytics_Ads_Disabled', value: false }];

module.exports = { manifest: manifest, files: files, settings: settings };