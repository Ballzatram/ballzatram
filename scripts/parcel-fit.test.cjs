"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildRequest, clean } = require("../tools/parcel-fit/app.js");

const root = path.resolve(__dirname, "../tools/parcel-fit");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("formats a customer inquiry as an email draft, not a submitted lead", () => {
  const request = buildRequest({
    name: "Jane Buyer",
    email: "jane@example.com",
    role: "Land buyer / investor",
    region: "York County, SC",
    use: "20-stall equestrian facility",
    property: "https://example.com/parcel?a=1&b=2",
    acreage: "20 acres, 3 contiguous usable",
    notes: "Event parking matters"
  });
  assert.equal(request.email, "devin.gallemore@gmail.com");
  assert.match(request.subject, /^Parcel Fit pilot inquiry - York County, SC$/);
  assert.match(request.body, /20-stall equestrian facility/);
  assert.match(request.body, /scope, price,/);
  const url = new URL(request.mailto);
  assert.equal(url.protocol, "mailto:");
  assert.equal(url.pathname, "devin.gallemore@gmail.com");
  assert.equal(url.searchParams.get("subject"), request.subject);
  assert.equal(url.searchParams.get("body"), request.body);
});

test("rejects incomplete and invalid inquiry data", () => {
  const base = { name: "A", email: "a@example.com", region: "Charlotte", use: "Polo club" };
  assert.throws(() => buildRequest({ ...base, use: "" }), /required/);
  assert.throws(() => buildRequest({ ...base, email: "not-an-email" }), /valid email/);
});

test("normalizes controls and bounds fields before generating mailto", () => {
  assert.equal(clean("  One\r\nTwo\tThree  ", 40), "One Two Three");
  const r = buildRequest({
    name: "Somebody",
    email: "person@example.com",
    region: "NC\r\nBCC: evil@example.com",
    use: "Venue",
    notes: "a".repeat(2000)
  });
  assert.equal(r.subject.includes("\r"), false);
  assert.equal(r.subject.includes("\n"), false);
  assert.equal(r.body.includes("a".repeat(901)), false);
  assert.match(r.body, /Not selected yet/);
});

test("site exposes working sample, consented email intake and clear limits", () => {
  const page = read("index.html");
  const sample = read("sample.html");
  const script = read("app.js");
  assert.match(page, /id="request-form"/);
  assert.match(page, /id="draft"/);
  assert.match(page, /id="send-email"/);
  assert.match(page, /name="understand" required/);
  assert.match(page, /Nothing has been sent yet/);
  assert.match(page, /from \$299/i);
  assert.match(page, /sample\.html/);
  assert.match(page, /app\.js/);
  assert.match(sample, /FICTIONAL SCENARIO/);
  assert.match(sample, /NO SOURCES CHECKED/);
  assert.match(sample, /Not a real property assessment/i);
  assert.match(script, /mailto:/);
  assert.doesNotMatch(script, /\bfetch\s*\(/);
  assert.doesNotMatch(page, /buy\.stripe\.com/);
});
