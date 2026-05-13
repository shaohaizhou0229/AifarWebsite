# AifarWebsite 项目说明

## 使用者背景

- Martin 是 Aifar 产品总监，熟悉产品规划、产品定位和设计思路。
- Martin 不懂代码，所以沟通时应尽量用产品语言解释问题、影响和选择，不要默认使用技术黑话。
- 输出内容优先使用中文和 Markdown，结构要清晰。
- 处理任务时遵循“先分析、再规划、后执行”的节奏；如果已经有足够上下文，可以直接执行，但仍要简要说明判断依据。

## 操作边界

- 每一步代码修改完成后，都要自动创建一次 Git 提交，提交信息要简洁说明本次改动。
- 禁止批量删除文件或目录。
- 不要使用以下命令或等价操作：
  - `del /s`
  - `rd /s`
  - `rmdir /s`
  - `Remove-Item -Recurse`
  - `rm -rf`
- 如确实需要删除文件，只能一次删除一个明确路径的文件，例如：
  - `Remove-Item "C:\path\to\file.txt"`
- 如果需要批量删除文件，应停止操作，并请 Martin 手动确认或手动删除。

## 项目定位

- 项目名称：Aifar Website。
- GitHub 仓库地址：https://github.com/shaohaizhou0229/AifarWebsite.git。
- 产品：Aifar。
- 当前定位：面向政府和企业团队的轻量级标准协同平台。
- 官网目标：作为 Aifar 对外产品介绍、客户端下载、更新公告、文档、技术支持、联系咨询和安全说明的入口。
- 当前网站更像“首版官网骨架”，已经搭好页面结构、基础视觉、SEO 信息和占位内容，后续可继续接入真实下载、表单、文档和 Aifar 自身能力。

## 产品内容

Aifar 当前在网站中呈现的核心能力包括：

- Chat：团队沟通。
- Meeting：会议。
- Email：邮件。
- Contact：联系人和组织信息。
- Documents：文档。
- Workflow：流程。
- Forms：表单。

支持的客户端方向：

- PC。
- iOS。
- Android Phone。
- Android Pad。
- Mac Preview。

未来可接入的 Aifar 能力：

- Aifar Forms。
- Aifar Workflow。
- Aifar Docs。
- Aifar Chat。
- Aifar Meeting。
- Aifar Email。
- Aifar Contact。

## 技术结构

- 技术栈：Next.js、React、React DOM。
- Next.js 使用 App Router 结构，页面主要在 `app/` 目录下。
- `next.config.js` 设置了 `trailingSlash: true`，因此页面 URL 倾向使用 `/product/` 这种带结尾斜杠的形式。
- `jsconfig.json` 配置了 `@/*` 路径别名，方便从项目根目录引用组件。
- `package.json` 中提供了常用脚本：
  - `npm run dev`：本地开发预览。
  - `npm run build`：构建生产版本。
  - `npm run start`：启动 Next.js 生产服务。
  - `npm run validate`：运行项目自带校验脚本。

## 主要目录

- `app/`：Next.js 页面、全局布局和全局样式。
- `components/`：公共组件，如页头、页脚、卡片、页面头图、列表行。
- `data/`：结构化产品数据，目前有 `site.json`。
- `public/`：对外可访问的静态资源，包括图片、样式、脚本、robots 和 sitemap。
- `assets/`：另一份静态资源目录，内容与 `public/assets/` 基本重复，可能来自早期静态站版本。
- `product/`、`downloads/`、`docs/`、`support/`、`contact/`、`security/`、`whats-new/`：保留的静态 HTML 页面目录，可能是 Next.js 改造前的静态版本。
- `.next/`、`node_modules/`：本地构建和依赖目录，不应手动维护。

## 页面结构

当前 Next.js 页面包括：

- `/`：首页，展示 Aifar 品牌、产品定位、核心模块、团队管理场景、最新更新和行动按钮。
- `/product/`：产品能力页，展示 Chat、Meeting、Email、Contact、Documents、Workflow、Forms。
- `/downloads/`：下载页，列出 PC、iOS、Android Phone、Android Pad、Mac Preview，当前下载链接仍是占位。
- `/whats-new/`：更新页，用于发布版本亮点、客户端更新、修复和运营公告。
- `/docs/`：文档中心，预留用户指南、安装指南、管理员指南和安全概览入口。
- `/support/`：支持页，预留账号访问、安装、技术问题三类支持入口。
- `/contact/`：联系页，有占位表单，未来可接入 Aifar Forms、Workflow、Contact 和 Email。
- `/security/`：安全页，预留治理、隐私、部署和合规相关内容。

## 公共组件

- `SiteHeader.jsx`：网站顶部导航，包含品牌和主要页面入口。
- `SiteFooter.jsx`：页脚，包含版权和安全、文档、联系入口。
- `PageHero.jsx`：内页通用标题区。
- `Card.jsx`：能力卡片组件。
- `Rows.jsx`：下载行、文档入口、更新条目组件。

## 视觉与交互

- 全局样式在 `app/globals.css`。
- 主视觉偏清爽、政企协作工具风格，颜色以浅背景、深色文字、青绿色、蓝色和少量琥珀色为主。
- 首页主视觉图片是 `public/assets/images/aifar-hero.png`。
- 导航在移动端有菜单按钮。
- `public/assets/scripts/main.js` 负责导航状态、多语言切换和页面文案替换。

## SEO 与站点发布

- 每个 Next.js 页面基本都有 `metadata`、`description` 和 `canonical`。
- 首页包含 SoftwareApplication 结构化数据。
- `public/robots.txt` 允许搜索引擎抓取，并指向 `https://www.aifar.com/sitemap.xml`。
- `public/sitemap.xml` 已包含主要页面地址。
- 根目录也有 `robots.txt` 和 `sitemap.xml`，与 `public/` 中的发布文件形成重复，后续可统一维护策略。

## 校验脚本

- `validate-site.js` 会检查关键页面、组件、资源、依赖和脚本是否存在。
- 校验脚本关注页面是否有 metadata、description、canonical 和页面标题。
- 推荐在修改页面结构后运行：
  - `npm run validate`
  - `npm run build`

## 已知问题与注意事项

- `AGENTS.md` 之前出现过中文乱码，现已改为可读中文。
- `components/SiteFooter.jsx` 中版权符号附近存在乱码，页面可能显示为 `婕?2026 Aifar`。
- `public/assets/scripts/main.js` 中大量中文、繁体中文和法语文本存在乱码，多语言切换效果可能不可靠。
- `assets/` 与 `public/assets/` 有重复资源，后续要确认哪一个是主维护目录。对于 Next.js 网站，通常应优先维护 `public/assets/`。
- 根目录静态 HTML 页面与 `app/` 下 Next.js 页面并存，后续要明确是否继续保留静态版，避免同一内容维护两份。
- 下载按钮和文档链接目前多为占位链接，未接入真实下载地址或文档地址。
- 联系表单当前只是前端占位，不会真正提交。

## 后续维护建议

- 优先修复所有乱码内容，尤其是页脚版权和多语言脚本。
- 明确网站的主版本：如果以后以 Next.js 为主，应减少静态 HTML 版本的重复维护。
- 将真实下载地址、文档地址、支持流程和联系表单接入后端或 Aifar 内部能力。
- 如果要面向中文用户发布，建议把页面主文案系统性改成中文，而不是依赖当前乱码的多语言脚本。
- 每次改动后，至少运行 `npm run validate`；正式发布前运行 `npm run build`。
