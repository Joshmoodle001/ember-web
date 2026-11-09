import { writeFile } from "node:fs/promises";
import { COMPANY } from "../company.mjs";
import { PORTFOLIO_PROJECTS } from "../portfolio.mjs";

const target = process.argv[2];
if (!target) throw new Error("Usage: node scripts/client-pack-data.mjs OUTPUT_JSON");
await writeFile(target, JSON.stringify({ company: COMPANY, projects: PORTFOLIO_PROJECTS }, null, 2));
