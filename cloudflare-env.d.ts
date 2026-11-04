declare namespace Cloudflare {
  interface Env {
  LACO_SUPERADMIN_EMAIL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
