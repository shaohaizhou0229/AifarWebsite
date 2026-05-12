const fs = require("fs");
const path = require("path");

const root = __dirname;
const pages = [
  "app/page.jsx",
  "app/product/page.jsx",
  "app/downloads/page.jsx",
  "app/whats-new/page.jsx",
  "app/docs/page.jsx",
  "app/support/page.jsx",
  "app/contact/page.jsx",
  "app/security/page.jsx"
];

let failures = 0;

function requireFile(file) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`missing ${file}`);
    failures += 1;
  }
}

for (const page of pages) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) {
    console.error(`missing ${page}`);
    failures += 1;
    continue;
  }

  const source = fs.readFileSync(file, "utf8");
  for (const token of ["metadata", "description", "canonical"]) {
    if (!source.includes(token)) {
      console.error(`${page}: missing ${token}`);
      failures += 1;
    }
  }

  if (!source.includes("<h1") && !source.includes("PageHero")) {
    console.error(`${page}: missing page heading`);
    failures += 1;
  }
}

for (const file of [
  "app/layout.jsx",
  "app/globals.css",
  "components/SiteHeader.jsx",
  "components/SiteFooter.jsx",
  "components/PageHero.jsx",
  "components/Card.jsx",
  "components/Rows.jsx",
  "public/robots.txt",
  "public/sitemap.xml",
  "public/assets/styles/main.css",
  "public/assets/scripts/main.js",
  "public/assets/images/aifar-hero.png",
  "next.config.js"
]) {
  requireFile(file);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const dependency of ["next", "react", "react-dom"]) {
  if (!pkg.dependencies || !pkg.dependencies[dependency]) {
    console.error(`package.json: missing ${dependency}`);
    failures += 1;
  }
}

for (const script of ["dev", "build", "start", "validate"]) {
  if (!pkg.scripts || !pkg.scripts[script]) {
    console.error(`package.json: missing ${script} script`);
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`${failures} validation issue(s) found.`);
  process.exit(1);
}

console.log("Aifar Next.js website validation passed.");
