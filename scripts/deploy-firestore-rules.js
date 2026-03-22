#!/usr/bin/env node
/**
 * Deploys firestore.rules to all named Firestore databases in the project
 * using the Firebase Rules REST API directly.
 *
 * Usage: node scripts/deploy-firestore-rules.js <access_token>
 *
 * The Firebase CLI's `firebase deploy --only firestore:rules` silently skips
 * named databases that were auto-created with deny-all rules (no prior CLI
 * deploy fingerprint). This script bypasses that by calling the API directly.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const token = process.argv[2];
if (!token) {
  console.error("Usage: node deploy-firestore-rules.js <access_token>");
  process.exit(1);
}

const PROJECT = "my-diving-40f82";
const DATABASES = ["(default)", "my-diving-40f82-qa", "my-diving-40f82"];
const rulesPath = path.join(__dirname, "..", "webapp", "firestore.rules");
const RULES = fs.readFileSync(rulesPath, "utf8");

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: "firebaserules.googleapis.com",
        path: urlPath,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (d) => (buf += d));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(buf) });
          } catch {
            resolve({ status: res.statusCode, body: buf });
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log(`Deploying Firestore rules to project ${PROJECT}...`);

  for (const db of DATABASES) {
    process.stdout.write(`  ${db}: creating ruleset... `);

    const rsResp = await request(
      "POST",
      `/v1/projects/${PROJECT}/rulesets`,
      { source: { files: [{ name: "firestore.rules", content: RULES }] } }
    );

    if (rsResp.status !== 200) {
      console.error(`\nFailed to create ruleset for ${db}:`, rsResp.body);
      process.exit(1);
    }

    const rulesetName = rsResp.body.name;
    const releaseName = `projects/${PROJECT}/releases/cloud.firestore/${db}`;

    // Try PATCH first (release already exists); fall back to POST (create) on 404
    let releaseResp = await request("PATCH", `/v1/${releaseName}`, {
      release: { name: releaseName, rulesetName },
    });

    if (releaseResp.status === 404) {
      releaseResp = await request(
        "POST",
        `/v1/projects/${PROJECT}/releases`,
        { release: { name: releaseName, rulesetName } }
      );
    }

    if (releaseResp.status !== 200) {
      console.error(`\nFailed to update release for ${db}:`, releaseResp.body);
      process.exit(1);
    }

    console.log(`✓ (${rulesetName.split("/").pop().substring(0, 8)}...)`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
