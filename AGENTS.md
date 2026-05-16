# AifarWebsite 项目说明

## 使用者背景

- Martin 是 Aifar 产品总监，熟悉产品规划、产品定位和设计思路。
- Martin 不懂代码，沟通时尽量用产品语言解释问题、影响和选择，不默认使用技术黑话。
- 输出内容优先使用中文和 Markdown，结构要清晰。
- 处理任务时遵循“先分析、再规划、后执行”的节奏；如果上下文已经足够，可以直接执行，但仍要简要说明判断依据。

## 操作边界

- 每一步代码修改完成后，都要自动创建一次 Git 提交，提交信息用中文，简洁说明本次改动。
- 禁止批量删除文件或目录。
- 不要使用以下命令或等价操作：
  - `del /s`
  - `rd /s`
  - `rmdir /s`
  - `Remove-Item -Recurse`
  - `rm -rf`
- 如确实需要删除文件，只能一次删除一个明确路径的文件，例如：
  - `Remove-Item "C:\path\to\file.txt"`
- 如果需要批量删除文件或目录，应停止操作，并请 Martin 手动确认或手动处理。

## 项目定位

- 项目名称：Aifar Website。
- GitHub 仓库地址：https://github.com/shaohaizhou0229/AifarWebsite.git。
- 产品：Aifar。
- 当前定位：面向政府和企业团队的轻量级标准协同平台。
- 官网目标：作为 Aifar 对外产品介绍、客户端下载、更新公告、文档、技术支持、联系咨询和安全说明的入口。

## 技术结构

- 技术栈：Next.js、React、React DOM、next-intl。
- Next.js 使用 App Router，页面主入口在 `app/[locale]/...`。
- 当前公开语言为 `en`、`zh-CN`、`fr`、`ar`，默认语言为 `en`。
- 国际化主线是：
  - `i18n/routing.js`：语言列表、默认语言、方向、路径工具。
  - `i18n/request.js`：next-intl 请求配置。
  - `i18n/messages.js`：按语言加载消息文件，不再用英文自动兜底缺失 key。
  - `i18n/seo.js`：canonical、hreflang、sitemap 相关路径。
  - `messages/*.json`：四套语言包，必须保持 key 完全同构。
- `next.config.js` 设置了 `trailingSlash: true`，页面 URL 倾向使用 `/en/product/` 这种带结尾斜杠的形式。
- `jsconfig.json` 配置了 `@/*` 路径别名。

## 主要目录

- `app/`：Next.js 页面、API 路由、全局布局和全局样式。
- `components/`：公共组件，如页头、页脚、表单、后台导航、下载管理表单等。
- `i18n/`：国际化路由、消息加载、SEO 和标签格式化工具。
- `messages/`：`en`、`zh-CN`、`fr`、`ar` 四套语言包。
- `lib/`：认证、下载、工单、资料、数据库访问等服务逻辑。
- `public/assets/images/`：对外可访问的图片资源；当前首页主视觉为 `public/assets/images/aifar-hero.png`。
- `supabase/migrations/`：数据库迁移文件。
- `.next/`、`node_modules/`：本地构建和依赖目录，不应手动维护。

## 页面结构

当前 Next.js 页面以语言前缀访问，包括：

- `/[locale]/`：首页。
- `/[locale]/product/`：产品能力页。
- `/[locale]/downloads/`：客户端下载页。
- `/[locale]/whats-new/`：更新公告页。
- `/[locale]/docs/`：文档中心。
- `/[locale]/support/`：支持页。
- `/[locale]/contact/`：联系表单页。
- `/[locale]/security/`：安全说明页。
- `/[locale]/login/`、`/[locale]/register/`：账号入口。
- `/[locale]/account/...`：用户账户、资料和工单。
- `/[locale]/admin/...`：后台管理入口、联系请求、工单、下载版本管理和预留模块。

## 国际化维护规则

- 新增页面、组件、按钮、提示、错误、状态、SEO 文案时，必须同步更新 `messages/en.json`、`messages/zh-CN.json`、`messages/fr.json`、`messages/ar.json`。
- 四套语言包必须 key 完全一致；不允许依赖英文兜底作为长期方案。
- 用户可见文案不要硬编码在页面或组件里，尤其是：
  - 上传状态、暂停/恢复、删除确认、错误提示。
  - 工单状态、请求类型、发布状态等枚举。
  - OAuth 登录错误。
  - SEO 标题和描述。
- 工单状态等枚举应通过 `i18n/labels.js` 读取语言包标签，不要使用 `replace("_", " ")` 直接展示。
- 旧静态 HTML 页面和旧前端翻译脚本已清理；后续不要恢复根目录 `index.html`、`product/index.html` 等旧入口，也不要恢复 `assets/scripts/main.js` 或 `public/assets/scripts/main.js` 作为翻译来源。

## 校验脚本

- `validate-site.js` 会检查：
  - 关键页面、组件、i18n 文件、消息文件是否存在。
  - 页面是否包含 metadata、description、buildMetadata 和标题。
  - 四套语言包 key 是否同构。
  - 旧静态 HTML 和旧翻译脚本是否回流。
  - 关键硬编码国际化文案模式是否回流。
- 修改页面结构、国际化、SEO、后台表单或下载逻辑后，至少运行：
  - `npm.cmd run validate`
  - `npm.cmd run build`

## 已知注意事项

- `npm.cmd run build` 在当前 Windows 环境可能出现 Next SWC 原生包警告：`next-swc.win32-x64-msvc.node is not a valid Win32 application`。目前构建仍可完成，暂按环境警告处理。
- 工作区可能存在未跟踪的临时目录或文件，例如 `tmp-*`、`pages/`、`deno.lock`；不要在无明确要求时清理它们。
- 删除文件必须逐个明确路径执行，不能递归删除目录。
