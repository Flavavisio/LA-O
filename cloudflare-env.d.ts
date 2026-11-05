declare namespace Cloudflare {
  interface Env {
  LACO_SUPERADMIN_EMAIL?: string;
  LACO_PASSWORD_PERMIT_SECRET?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
