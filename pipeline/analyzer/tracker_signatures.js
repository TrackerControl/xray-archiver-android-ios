const manifest = [ 
                   { signature: 'com.google.android.gms.ads', name: 'GAds'},
                   { signature: 'com.google.firebase', name: 'Firebase'},
                   { signature: 'com.facebook.sdk.ApplicationId', name: 'FB'},
                   { signature: 'com.google.android.c2dm.intent', name: 'GCM'},
                   { signature: 'applovin.sdk.key', name: 'AppLovin'},
                   { signature: 'io.branch.sdk.BranchKey', name: 'branch.io'},
                   { signature: 'io.fabric.ApiKey', name: 'Fabric'}
                 ];

const settings = [
                   { signature: 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT', name: 'GAds_Init_Delayed', value: 'true' },
                   { signature: 'com.facebook.sdk.AutoLogAppEventsEnabled', name: 'FB_Events_Delayed', value: 'false' },
                   { signature: 'com.facebook.sdk.AutoInitEnabled', name: 'FB_Init_Delayed', value: 'false' },
                   { signature: 'com.facebook.sdk.AdvertiserIDCollectionEnabled', name: 'FB_ADID_Disabled', value: 'false' },
                   { signature: 'firebase_messaging_auto_init_enabled', name: 'Firebase_Messaging_Delayed', value: 'false' },
                   { signature: 'firebase_analytics_collection_enabled', name: 'Firebase_Analytics_Disabled', value: 'false' },
                   { signature: 'firebase_analytics_collection_deactivated', name: 'Firebase_Analytics_Deactivated', value: 'true' },
                   { signature: 'google_analytics_adid_collection_enabled', name: 'Firebase_IDFV_Disabled', value: 'false' },
                   { signature: 'google_analytics_default_allow_ad_personalization_signals', name: 'Firebase_Analytics_Ads_Disabled', value: 'false' }
                 ];

module.exports = { settings: settings, manifest: manifest };