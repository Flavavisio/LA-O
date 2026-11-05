import { integer, real, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const system = sqliteTable('system', { id: integer('id').primaryKey(), owner: text('owner').notNull() });
export const families = sqliteTable('families', {
  id: text('id').primaryKey(), name: text('name').notNull(), seats: integer('seats').notNull(),
  expires: text('expires').notNull(), status: text('status').notNull().default('active'), created: text('created').notNull(),
});
export const members = sqliteTable('members', {
  id: text('id').primaryKey(), family: text('family').notNull().references(() => families.id), name: text('name').notNull(),
  email: text('email'), userId: text('user_id'), role: text('role').notNull().default('member'),
  primary: integer('is_primary').notNull().default(0), adult: integer('adult').notNull().default(1),
  relation: text('relation').notNull(), consent: integer('consent').notNull().default(0), consentAt: text('consent_at'),
  consentBy: text('consent_by'), lat: real('lat'), lng: real('lng'), accuracy: real('accuracy'),
  batteryConsent: integer('battery_consent').notNull().default(0), battery: integer('battery'), charging: integer('charging'), batterySource: text('battery_source'), batteryUpdated: text('battery_updated'),
  speed: real('speed'), updated: text('updated'), created: text('created').notNull(),
}, t => [uniqueIndex('family_email').on(t.family, t.email)]);
export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(), family: text('family').notNull().references(() => families.id),
  member: text('member').notNull().references(() => members.id), kind: text('kind').notNull(),
  status: text('status').notNull().default('open'), created: text('created').notNull(),
  acknowledgedBy: text('acknowledged_by'), acknowledgedAt: text('acknowledged_at'),
});
export const audit = sqliteTable('audit', {
  id: text('id').primaryKey(), family: text('family'), actor: text('actor').notNull(), action: text('action').notNull(), created: text('created').notNull(),
});
export const notificationDevices = sqliteTable('notification_devices', {
 id:text('id').primaryKey(),userId:text('user_id').notNull(),platform:text('platform').notNull(),
 provider:text('provider').notNull(),token:text('token').notNull(),environment:text('environment').notNull(),updated:text('updated').notNull(),
},t=>[index('notification_devices_user').on(t.userId),uniqueIndex('notification_devices_provider_token').on(t.provider,t.token)]);
export const notificationJobs = sqliteTable('notification_jobs', {
 id:text('id').primaryKey(),alert:text('alert').notNull().references(()=>alerts.id),family:text('family').notNull().references(()=>families.id),
 deviceId:text('device_id').references(()=>notificationDevices.id,{onDelete:'set null'}),
 status:text('status').notNull().default('queued'),attempts:integer('attempts').notNull().default(0),lastError:text('last_error'),
 created:text('created').notNull(),updated:text('updated').notNull(),
},t=>[index('notification_jobs_alert').on(t.alert)]);
