import assert from "node:assert/strict";
import test from "node:test";
import { PORTFOLIO_PROJECTS, renderPortfolio } from "../portfolio.mjs";
import { renderBody } from "../design2-pages.mjs";
import { renderDocument } from "../design2.mjs";

test("public portfolio links are limited to the reviewed public product entry points", () => {
  const approved = new Set([
    "https://app-biosync.co.za/",
    "https://flexi-form-wine.vercel.app/",
    "https://me-body.vercel.app/",
    "https://web-three-rust-49.vercel.app/",
  ]);
  for (const project of PORTFOLIO_PROJECTS) {
    if (!project.url) continue;
    assert.ok(approved.has(project.url), `Unreviewed portfolio destination: ${project.id}`);
    const url = new URL(project.url);
    assert.equal(url.protocol, "https:");
    assert.equal(url.pathname, "/");
    assert.equal(url.search, "");
    assert.equal(url.hash, "");
    assert.equal(url.username + url.password, "");
  }
  assert.doesNotMatch(renderPortfolio(), /prj_|team_Koec|_vercel_share|finance-ledger|\/admin(?:[\/?"#])|hbdxhbwufgkrwqxpieds|joshmoodley|pfg-catalogue\.app|fuel\.app-biosync/i);
});

test("portfolio enquiries preserve the selected application's purpose without exposing an internal record", () => {
  const markup = renderPortfolio();
  const links = [...markup.matchAll(/href="(\/start\?[^"]+)"/g)].map(match => new URL(match[1].replaceAll("&amp;", "&"), "https://emberweb.co.za"));
  for (const project of PORTFOLIO_PROJECTS) {
    assert.ok(links.some(url => url.searchParams.get("goal") === project.goal && url.searchParams.get("service") === project.service), project.id);
  }
});

test("portfolio is a discoverable page with one main landmark and explicitly illustrative images", () => {
  const document = renderDocument({ path: "/portfolio", title: "Our applications" }, renderBody("/portfolio"));
  assert.equal([...document.matchAll(/<main\b/g)].length, 1);
  assert.equal([...document.matchAll(/<h1\b/g)].length, 1);
  assert.match(document, /href="\/portfolio" aria-current="page"/);
  assert.match(document, /href="\/portfolio">Our portfolio/);
  assert.equal([...document.matchAll(/Illustrative interface · no client data/g)].length, PORTFOLIO_PROJECTS.length);
  assert.equal(new Set(PORTFOLIO_PROJECTS.map(project => project.id)).size, PORTFOLIO_PROJECTS.length);
});
