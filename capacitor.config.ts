import type {CapacitorConfig} from '@capacitor/cli';
const config:CapacitorConfig={
 appId:'pt.laco.familia',appName:'Laço',webDir:'mobile/dist',
 server:{hostname:'localhost',androidScheme:'https',cleartext:false},
 android:{useLegacyBridge:true,allowMixedContent:false},
 plugins:{PushNotifications:{presentationOptions:['badge','sound','banner','list']}}
};
export default config;
