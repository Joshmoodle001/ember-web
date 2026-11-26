import { readFileSync, readdirSync } from "node:fs";

const migrations = new URL("../migrations/", import.meta.url);
const read = (name) => readFileSync(new URL(name, import.meta.url), "utf8");

function scopeMigration(source) {
  return source
    .replace(/^(?:begin|commit);\s*$/gim, "")
    // Do not change shared auth permissions. The scoped projection replaces direct lookups.
    .replace(/^grant\s+[^;\n]+\s+on\s+auth\.users\s+to\s+service_role;\s*$/gim, "")
    .replace(/\bpublic\./g, "emberweb.")
    .replace(/'public'/g, "'emberweb'")
    .replace(/\bworkspace_private\b/g, "emberweb_private")
    .replace(/\bauthenticated\b/g, "emberweb_member")
    .replace(/\b(from|join) auth\.users\b/gi, "$1 emberweb_private.account_users")
    .replace(/auth\.uid\(\)/g, "emberweb_private.request_uid()")
    .replace(/auth\.jwt\(\)\s*->>\s*'email'/g, "emberweb_private.request_email()")
    .replace("id = p_user and email = p_operation", "id = p_user and auth_email = p_operation");
}

const files = readdirSync(migrations).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
const reviewedVersions = 20;
if (files.length !== reviewedVersions) throw new Error("Review new workspace migrations for shared-project scope before provisioning.");

const statements = files.map((name) => scopeMigration(readFileSync(new URL(name, migrations), "utf8")));
if (statements.some((sql) => /\bpublic\.|from\s+auth\.users|join\s+auth\.users|on\s+auth\.users\s+to/i.test(sql))) {
  throw new Error("An unscoped migration reference remains.");
}

process.stdout.write([read("prepare.sql"), ...statements, read("finish.sql")].join("\n"));
