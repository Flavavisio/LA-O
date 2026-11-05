declare namespace Cloudflare {
  interface Env {
  LACO_SUPERADMIN_EMAIL?: string;
  LACO_PASSWORD_PERMIT_SECRET?: string;
  LACO_FCM_SERVICE_ACCOUNT?: string;
  LACO_APNS_KEY?: string;
  LACO_APNS_KEY_ID?: string;
  LACO_APNS_TEAM_ID?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
