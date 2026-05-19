const fs = require("fs");
const path = require("path");

const root = __dirname;
const pages = [
  "app/[locale]/page.jsx",
  "app/[locale]/product/page.jsx",
  "app/[locale]/downloads/page.jsx",
  "app/[locale]/whats-new/page.jsx",
  "app/[locale]/docs/page.jsx",
  "app/[locale]/docs/[slug]/page.jsx",
  "app/[locale]/support/page.jsx",
  "app/[locale]/contact/page.jsx",
  "app/[locale]/security/page.jsx",
  "app/[locale]/login/page.jsx",
  "app/[locale]/register/page.jsx",
  "app/[locale]/account/page.jsx",
  "app/[locale]/account/profile/page.jsx",
  "app/[locale]/account/notifications/page.jsx",
  "app/[locale]/account/tickets/page.jsx",
  "app/[locale]/account/tickets/[id]/page.jsx",
  "app/[locale]/admin/page.jsx",
  "app/[locale]/admin/contact/page.jsx",
  "app/[locale]/admin/collaboration/page.jsx",
  "app/[locale]/admin/collaboration/spaces/[id]/page.jsx",
  "app/[locale]/admin/docs/page.jsx",
  "app/[locale]/admin/docs/new/page.jsx",
  "app/[locale]/admin/docs/[id]/page.jsx",
  "app/[locale]/admin/downloads/page.jsx",
  "app/[locale]/admin/downloads/[platform]/page.jsx",
  "app/[locale]/admin/product/page.jsx",
  "app/[locale]/admin/support/page.jsx",
  "app/[locale]/admin/tickets/page.jsx",
  "app/[locale]/admin/tickets/[id]/page.jsx",
  "app/[locale]/admin/users/page.jsx",
  "app/[locale]/admin/users/[id]/page.jsx"
];

const locales = ["en", "zh-CN", "fr", "ar"];
const legacyFiles = [
  "index.html",
  "product/index.html",
  "downloads/index.html",
  "docs/index.html",
  "support/index.html",
  "contact/index.html",
  "security/index.html",
  "whats-new/index.html",
  "assets/scripts/main.js",
  "assets/styles/main.css",
  "assets/images/aifar-hero.png",
  "public/assets/scripts/main.js",
  "public/assets/styles/main.css"
];
const forbiddenSourcePatterns = [
  "Upload status:",
  "Original file:",
  "Resume upload",
  "status.replace",
  "{plural}",
  "Google sign in failed.",
  "Google sign in callback is missing a code."
];

let failures = 0;

function requireFile(file) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`missing ${file}`);
    failures += 1;
  }
}

function readFile(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function collectMessageKeys(value, prefix = "") {
  if (Array.isArray(value) || !value || typeof value !== "object") {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectMessageKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

function compareMessageKeys() {
  const baseKeys = collectMessageKeys(JSON.parse(readFile("messages/en.json"))).sort();

  for (const locale of locales.slice(1)) {
    const keys = collectMessageKeys(JSON.parse(readFile(`messages/${locale}.json`))).sort();
    const missing = baseKeys.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !baseKeys.includes(key));

    if (missing.length || extra.length) {
      console.error(`messages/${locale}.json: key mismatch`);
      if (missing.length) console.error(`  missing: ${missing.join(", ")}`);
      if (extra.length) console.error(`  extra: ${extra.join(", ")}`);
      failures += 1;
    }
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

  if (!source.includes("<h1") && !source.includes("PageHero") && !source.includes("AdminPlaceholderPage")) {
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
  "components/AdminDownloadForm.jsx",
  "components/AdminDocumentForm.jsx",
  "components/MarkdownContent.jsx",
  "components/AdminUserForm.jsx",
  "components/AdminCollaborationForms.jsx",
  "components/NotificationActions.jsx",
  "public/assets/images/aifar-hero.png",
  "i18n/routing.js",
  "i18n/request.js",
  "i18n/messages.js",
  "i18n/seo.js",
  "i18n/labels.js",
  "messages/en.json",
  "messages/zh-CN.json",
  "messages/fr.json",
  "messages/ar.json",
  "tools/normalize-i18n-messages.cjs",
  "middleware.js",
  "next.config.js"
]) {
  requireFile(file);
}

for (const file of legacyFiles) {
  if (fs.existsSync(path.join(root, file))) {
    console.error(`legacy static file should not exist: ${file}`);
    failures += 1;
  }
}

const routingSource = readFile("i18n/routing.js");
for (const locale of locales) {
  if (!routingSource.includes(`"${locale}"`)) {
    console.error(`i18n/routing.js: missing locale ${locale}`);
    failures += 1;
  }
}

compareMessageKeys();

for (const file of [
  ...pages,
  "components/AdminDownloadForm.jsx",
  "components/AdminTicketActions.jsx",
  "app/api/auth/callback/route.js",
  "app/api/auth/google/route.js"
]) {
  const source = readFile(file);
  for (const pattern of forbiddenSourcePatterns) {
    if (source.includes(pattern)) {
      console.error(`${file}: forbidden hard-coded i18n text or fallback pattern: ${pattern}`);
      failures += 1;
    }
  }
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
