const fs = require("fs");
const path = require("path");

const root = __dirname;
const pages = [
  "app/[locale]/page.jsx",
  "app/[locale]/product/page.jsx",
  "app/[locale]/downloads/page.jsx",
  "app/[locale]/whats-new/page.jsx",
  "app/[locale]/docs/page.jsx",
  "app/[locale]/support/page.jsx",
  "app/[locale]/contact/page.jsx",
  "app/[locale]/security/page.jsx",
  "app/[locale]/login/page.jsx",
  "app/[locale]/register/page.jsx",
  "app/[locale]/account/page.jsx",
  "app/[locale]/account/profile/page.jsx",
  "app/[locale]/account/tickets/page.jsx",
  "app/[locale]/account/tickets/[id]/page.jsx",
  "app/[locale]/admin/tickets/page.jsx",
  "app/[locale]/admin/tickets/[id]/page.jsx"
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
  for (const token of ["generateMetadata", "description", "buildMetadata"]) {
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
  "app/[locale]/layout.jsx",
  "app/globals.css",
  "app/robots.js",
  "app/sitemap.js",
  "components/SiteHeader.jsx",
  "components/SiteFooter.jsx",
  "components/LanguageSwitcher.jsx",
  "components/MobileMenu.jsx",
  "components/PageHero.jsx",
  "components/Card.jsx",
  "components/Rows.jsx",
  "components/AuthForms.jsx",
  "components/ProfileForm.jsx",
  "components/SignOutButton.jsx",
  "components/AdminTicketActions.jsx",
  "public/assets/styles/main.css",
  "public/assets/images/aifar-hero.png",
  "i18n/routing.js",
  "i18n/request.js",
  "i18n/messages.js",
  "i18n/seo.js",
  "messages/en.json",
  "messages/zh-CN.json",
  "messages/fr.json",
  "messages/ar.json",
  "middleware.js",
  "next.config.js"
]) {
  requireFile(file);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const dependency of ["@supabase/ssr", "@supabase/supabase-js", "next", "next-intl", "pg", "react", "react-dom"]) {
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
