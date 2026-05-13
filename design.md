# Aifar 官网设计规划

## 1. 设计定位

Aifar 官网面向海外政府与企业客户，网站应呈现为一个可信、清晰、可运营的产品发布与服务入口，而不是单纯的营销展示页。

核心定位：

> Aifar is a lightweight standard collaboration tool for government and enterprise teams.

设计关键词：

- Trustworthy：可信、稳定、正式
- Lightweight：轻量、清爽、易理解
- Structured：标准化、有秩序、便于管理
- Global：国际化、中性、适合海外客户
- Operational：面向真实使用、下载、文档、支持和联系流程

不建议的方向：

- 过度炫技的科技风
- 大面积紫色、霓虹、深色渐变
- 抽象插画堆叠
- 过多营销口号
- 信息密度过低的纯品牌展示

## 2. Figma 原型目标

Figma 原型需要帮助我们确认三件事：

1. 网站整体气质是否符合政府与企业客户的信任预期。
2. 页面信息架构是否清楚，客户能否快速找到产品、下载、更新、文档、支持和联系入口。
3. 组件风格是否适合后续开发成可维护的网站设计系统。

建议先制作高保真但不追求最终视觉细节的原型，重点验证布局、层级、文案、导航和核心转化路径。

## 3. 设计系统

### 3.1 色彩

主色应克制，强调稳定和专业。页面整体以白色、浅灰、深色文字为主，主色只用于操作、重点标签和状态强调。

| Token | 颜色 | 用途 |
|---|---:|---|
| Ink | `#17202A` | 主文字、主按钮、标题 |
| Muted | `#5B6876` | 辅助文字 |
| Background | `#F7F9FB` | 页面背景 |
| Surface | `#FFFFFF` | 卡片、表单、导航 |
| Line | `#DBE2EA` | 分割线、边框 |
| Primary Teal | `#167C80` | 品牌主色、图标、强调 |
| Enterprise Blue | `#285F9F` | 辅助强调、链接、标签 |
| Accent Amber | `#B86B19` | 少量状态或版本强调 |
| Success Green | `#2F7D52` | 成功状态、稳定版本 |

使用比例建议：

- 70% 白色与浅灰背景
- 20% 深色文字与边框
- 8% 青绿/蓝色品牌色
- 2% 琥珀色或绿色状态色

### 3.2 字体

首版英文官网建议使用：

- Font family：Inter / system-ui
- 字重：400、500、650、700、800
- 字距：0，不使用负字距

字号建议：

| 样式 | Desktop | Mobile |
|---|---:|---:|
| H1 | 64-80 | 40-48 |
| Page H1 | 48-64 | 36-44 |
| H2 | 36-44 | 28-34 |
| H3 | 18-22 | 17-20 |
| Body | 16-18 | 16 |
| Small | 14 | 14 |

文案风格：

- 短句优先
- 描述具体能力，不使用空泛概念
- 避免 “reimagine / revolutionary / next-generation” 这类泛化营销词

推荐表达：

> Lightweight standard collaboration for government and enterprise teams.

## 4. 栅格与布局

### 4.1 画板尺寸

Figma 建议创建这些 Frame：

- Desktop：1440 x variable
- Laptop：1280 x variable
- Tablet：768 x variable
- Mobile：390 x variable

### 4.2 内容宽度

- 页面最大内容宽度：1160px
- Desktop 左右边距：40px
- Mobile 左右边距：20px 或 24px
- Section 垂直间距：64-80px
- 组件间距：16px / 24px / 32px

### 4.3 页面结构原则

- 页面区块使用 full-width section，不把大区块做成悬浮卡片。
- Card 只用于功能项、下载项、文档项、更新项、支持入口。
- 不做卡片套卡片。
- 首屏必须直接出现 Aifar 品牌与产品定位。
- 每个页面都要有清晰的单一 H1。

## 5. 核心组件

### 5.1 Header

组成：

- 左侧：Aifar logo mark + Aifar wordmark
- 右侧导航：Product / Downloads / What's New / Docs / Support / Contact
- 移动端：菜单按钮展开导航

样式：

- 高度：72px
- 背景：浅灰半透明或白色
- 底部分割线：`#DBE2EA`
- 当前页面导航项使用浅蓝背景

### 5.2 Button

类型：

- Primary：深色背景，白色文字
- Secondary：白色背景，浅边框，深色文字
- Text Link：用于非主要跳转

规范：

- 圆角：8px
- 高度：46px
- 左右内边距：16px
- 按钮文字不换行时优先；移动端可撑满宽度

### 5.3 Card

用途：

- 产品能力
- 下载客户端
- 文档入口
- 支持入口
- What’s New 条目

样式：

- 背景：`#FFFFFF`
- 边框：`#DBE2EA`
- 圆角：8px
- 内边距：22px-24px
- 阴影只在关键视觉容器中使用，普通卡片尽量不用阴影

### 5.4 Tag / Pill

用途：

- Stable
- Preview
- Docs
- Client
- Security
- Release

样式：

- 圆角：999px
- 高度：28-32px
- 背景：浅蓝或浅青绿
- 字重：700-800

### 5.5 Form

用于 Contact 和 Support。

字段建议：

- Name
- Work email
- Organization
- Country / Region
- Request type
- Message

样式：

- Label 在输入框上方
- 输入框高度：44-48px
- Textarea 高度：120-160px
- 表单提交按钮放在左下方
- 未来可接入 Aifar Forms、Workflow、Contact、Email

## 6. 页面原型规划

### 6.1 Home

目标：让海外政府与企业客户在 10 秒内理解 Aifar 是什么。

首屏内容：

- Eyebrow：Government and enterprise collaboration
- H1：Aifar
- Subtitle：Lightweight standard collaboration for government and enterprise teams.
- CTA：
  - Download Aifar
  - Contact Sales
- 视觉：桌面 + 手机/平板产品界面 mockup

页面区块：

1. Hero
2. Client Access：PC / iOS / Android Phone / Android Pad / Mac Preview
3. Core Capabilities：Chat / Meeting / Email / Contact / Documents / Workflow / Forms
4. Enterprise Readiness：Standardized collaboration / Security / Cross-device / Support
5. What’s New 摘要
6. Docs & Support 入口
7. Contact CTA

### 6.2 Product

目标：展示 Aifar 的能力完整性，但不做过长营销叙事。

建议布局：

- Page Hero：一句话说明产品能力
- Capability Matrix：7 个能力卡片
- Work Scenarios：
  - Department communication
  - Cross-organization meetings
  - Document distribution
  - Process approval
  - Data collection by forms
- Future Integration：网站可接入 Aifar 自有能力

### 6.3 Downloads

目标：成为明确、可靠的客户端下载中心。

下载项字段：

- Client name
- Platform
- Version
- Release date
- File size
- Channel：Stable / Preview
- System requirements
- Download button
- Release notes link

客户端：

- PC Client
- iOS Client
- Android Phone
- Android Pad
- Mac Client Preview

### 6.4 What's New

目标：发布版本更新、产品公告和客户端更新。

布局：

- 顶部筛选：All / Product / Client / Docs / Security
- 更新列表：日期 + 类型 + 标题 + 摘要
- 详情页后续可规划为文章页

SEO 重点：

- 每条更新应可拥有独立 URL
- 标题包含版本、平台或功能关键词

### 6.5 Docs

目标：成为长期 SEO 与客户自助服务入口。

文档分类：

- Getting Started
- User Guide
- Client Installation
- Admin Guide
- Deployment
- Security
- FAQ
- Troubleshooting

后续增强：

- 搜索
- 文档详情页
- 多语言
- 接入 Aifar Docs

### 6.6 Support

目标：让客户能快速定位支持类型。

支持入口：

- Account Access
- Installation
- Technical Issue
- Deployment Support
- Security Question

未来接入：

- Aifar Forms 收集问题
- Aifar Workflow 分配处理流程
- Aifar Chat 提供在线支持
- Aifar Email 发送确认与进度通知

### 6.7 Contact

目标：面向商务咨询、政府企业客户咨询和技术支持。

建议结构：

- 左侧：联系说明、适用场景、响应承诺
- 右侧：联系表单
- 下方：Sales / Support / Partnership 三类联系入口

### 6.8 Security

目标：给政府与企业客户提供信任基础。

内容方向：

- Governance
- Privacy
- Deployment
- Access Control
- Data Handling
- Compliance-ready Documentation

注意：当前阶段不要虚构认证资质。尚未确认的合规内容应使用 “prepared for / designed to support / documentation area” 这类表达。

## 7. 图像与图标风格

### 7.1 Hero 图

推荐风格：

- 产品界面 mockup
- 桌面 + 手机 + 平板组合
- 白色或浅灰背景
- 表现 Chat、Meeting、Email、Docs、Workflow、Forms
- 不出现真实政府徽章、第三方品牌 logo 或虚假认证标识

### 7.2 功能图标

建议后续使用 lucide 风格线性图标：

- Chat：MessageSquare
- Meeting：Video
- Email：Mail
- Contact：Contact
- Documents：FileText
- Workflow：GitBranch
- Forms：ClipboardList
- Downloads：Download
- Security：ShieldCheck

图标规范：

- 线宽统一
- 尺寸 20px 或 24px
- 外层可放 38px-44px 的浅色图标容器

## 8. 交互状态

Figma 原型建议覆盖：

- Header 当前页面状态
- Header 移动端展开状态
- Button hover / disabled
- Download card 的 Stable / Preview 状态
- Contact form 默认 / 聚焦 / 错误 / 成功状态
- What’s New 筛选状态
- Docs 分类 hover 状态

表单错误示例：

- Work email is required.
- Please enter a valid business email.
- Message must be at least 20 characters.

成功状态示例：

> Your request has been received. The Aifar team will contact you soon.

## 9. SEO 与内容规范

每个页面需要：

- 唯一 Title
- 唯一 Meta Description
- 唯一 H1
- 清晰 H2 结构
- Canonical
- Open Graph 信息

建议页面标题：

- Home：Aifar | Lightweight Standard Collaboration for Government and Enterprise Teams
- Product：Product | Aifar
- Downloads：Downloads | Aifar
- What's New：What's New | Aifar
- Documentation：Documentation | Aifar
- Support：Support | Aifar
- Contact：Contact | Aifar
- Security：Security | Aifar

关键词方向：

- Aifar collaboration tool
- enterprise collaboration software
- government collaboration platform
- secure team communication
- workflow and forms software
- business collaboration tools
- Aifar download

## 10. Figma 文件组织建议

建议 Figma 页面分组：

1. Cover
2. Design Tokens
3. Components
4. Desktop Pages
5. Mobile Pages
6. Prototype Flow
7. Feedback Notes

建议组件命名：

- `Header / Desktop`
- `Header / Mobile`
- `Button / Primary`
- `Button / Secondary`
- `Card / Capability`
- `Card / Download`
- `Card / Doc Link`
- `Card / Release`
- `Form / Contact`
- `Tag / Status`

## 11. 原型反馈清单

你在 Figma 中预览后，可以按这些问题给我反馈：

1. Aifar 的首屏是否足够可信？
2. 首页是否应该更偏“产品能力”还是更偏“下载入口”？
3. 政府企业客户是否需要更突出的 Security 页面入口？
4. 下载页是否需要版本号、平台要求、二维码或安装包说明？
5. 文档页是否要优先做成文档中心，还是先做简单入口？
6. 联系表单字段是否足够，是否需要区分 Sales / Support？
7. 是否需要多语言入口，例如 English / 简体中文 / 繁體中文 / Français？
8. 当前视觉是否太轻、太冷、太普通，还是正好适合政企客户？

## 12. 下一步开发方向

建议按以下顺序推进：

1. 在 Figma 中确认设计系统与首页原型。
2. 根据原型调整 Next.js 首页和公共组件。
3. 完成下载页的真实信息结构。
4. 完成 Docs / What’s New 的内容模型。
5. 完成 Contact 表单的真实提交与管理流程。
6. 接入 Aifar 自有能力：Forms、Workflow、Docs、Contact、Email。

## 13. 已合并的品牌与 UI 规范

本章节根据以下两份规范整理，并作为 Aifar 官网后续设计与开发的优先参考：

- `Aifar产品 LOGO 设计方案.pdf`
- `Alpha产品UI设计规范-双语.pdf`

说明：两份 PDF 主要以设计图导出形式存在，当前项目已通过可视化读取方式提炼关键规则。涉及精确色值、Logo 安全区、矢量源文件、字体授权等内容，后续仍应以原始 Figma / AI / SVG 源文件为最终依据。

### 13.1 Aifar Logo 使用方向

Aifar 的品牌标识采用抽象字母 A / Alpha 形态，整体是具有流动感的蓝色到青色渐变图形。官网中应优先使用该正式标识，而不是当前占位的字母 `A` 方块。

Logo 使用原则：

- 优先使用彩色渐变版本作为官网主品牌标识。
- 深色背景上使用高对比版本，确保边缘清晰。
- 小尺寸场景可以只使用 Logo mark，不强制携带 wordmark。
- Header 中建议使用 `Logo mark + Aifar` 组合。
- Favicon、App icon、社交分享图可使用独立 Logo mark。
- 不应拉伸、旋转、裁切、添加额外阴影或改变渐变方向。
- 不应将 Logo 放在复杂图片、低对比背景或强纹理背景上。

官网落地要求：

- 当前 Header 的 `brand-mark` 需要替换为正式 Aifar Logo 图形。
- Figma 原型中应建立 `Logo / Mark`、`Logo / Horizontal`、`Logo / Reversed` 三个组件。
- 开发中应将正式 Logo 存放在 `public/assets/brand/`，优先使用 SVG 或透明 PNG。

### 13.2 Alpha UI 规范对官网的适用范围

Alpha UI 规范更偏产品界面组件体系，官网不需要完整照搬移动端 App 规范，但应继承以下设计语言：

- 清晰、简洁、轻量的界面表达。
- 大面积白色或浅色背景。
- 高对比标题 + 低饱和辅助文字。
- 蓝色作为主要选中和操作状态。
- 线性图标体系。
- 明确的默认、选中、禁用状态。
- 组件圆角按尺寸分级使用。
- 移动端触控目标不小于 40x40px。

官网应避免：

- 为了贴近 App 规范而把官网做成移动应用壳。
- 在桌面官网上大量使用底部 TabBar。
- 使用过多 App 内导航形态，导致官网信息架构变复杂。

### 13.3 栅格与 Dashboard 规则

Alpha UI 中 Dashboard 被定义为“以网格形式提供功能入口和内容展示”，适合用于 Aifar 官网的产品能力、客户端下载和文档入口。

官网应用：

- 首页能力区可使用 3 或 4 列网格。
- 下载页可使用列表优先，也可在顶部使用平台卡片网格。
- 文档首页可使用分类网格。
- 每个网格项应包含标题，必要时包含描述文字与图标。
- 网格项数量较多时，优先保持同一行内容高度一致。

Figma 建议：

- `Card / Capability`：图标 + 标题 + 简短描述。
- `Card / Download`：平台图标 + 客户端名称 + 版本/状态 + 下载按钮。
- `Card / Docs`：文档类型 + 描述 + 标签。

### 13.4 导航规则

Alpha UI 中包含 Lateral Navigation、List Navigation、Side Navigation、TabBar 等导航类型。官网应选择更符合 Web 访问习惯的导航方式。

官网导航建议：

- Desktop 使用顶部 Header 导航。
- Mobile 使用汉堡菜单展开导航。
- Docs 或 Support 后续内容变多时，可以增加左侧 Side Navigation。
- What’s New 筛选可使用 Segmented Control 或 Tag Category。
- 表单、下载、文档列表可以采用 List Navigation 的“行项目 + 右侧动作/箭头”结构。

适用关系：

| Alpha UI 组件 | 官网适用场景 |
|---|---|
| Dashboard | 首页能力入口、文档入口、下载入口 |
| List Navigation | 下载列表、文档列表、支持问题列表 |
| Side Navigation | 文档中心、后台管理、长内容页面 |
| Segmented Control | What’s New 分类、下载平台筛选 |
| TabBar | 仅移动 App 展示图或产品 mockup 中使用，不作为官网主导航 |

### 13.5 Segmented Control / Tag Category

规范中建议分段控件用于页面顶部的二级视图切换，选项数量一般控制在 2-3 个，较多选项可使用文字短线样式或 Tag Category。

官网应用：

- What’s New：`All / Product / Client / Docs / Security`
- Downloads：`All / Desktop / Mobile / Preview`
- Docs：`User / Admin / Deployment / Security`

规则：

- 2-3 项可使用胶囊式分段控件。
- 超过 3 项时优先使用文字标签或可横向滚动的 Tag Category。
- 当前选中项必须高亮，未选中项保持低对比。
- 选项名称长度尽量接近，避免控件宽度不均。

### 13.6 图标规范

Alpha UI 规范中图标尺寸以 8、12、16、20、24、32、48、64 为主要级别。官网建议使用其中的 20、24、32、48 四档。

官网图标规则：

- 导航、按钮内图标：20px。
- 卡片图标：24px。
- 功能模块重点图标：32px。
- 大型视觉或空状态图标：48px。
- 图标触控区不小于 40x40px。
- 线性图标优先，端点和拐角保持统一。
- 官网可继续使用 lucide 风格图标，但应控制线宽、圆角和视觉重量，避免不同图标库混用。

图标容器：

- 小图标容器：38-44px。
- 卡片图标容器建议使用浅蓝、浅青或浅灰背景。
- 选中态使用品牌蓝，禁用态使用灰色或半透明。

### 13.7 圆角规范

Alpha UI 规范中的圆角分级：

- 4px：超小组件，如小标签、Logo 辅助容器。
- 8px：常规组件，如按钮、输入框、普通标签。
- 12px：卡片圆角。
- 16px：面板、弹层、选择器。
- Capsule：胶囊按钮、状态标签、分段控件。
- Circle：头像、圆形图标按钮。

官网落地：

- Button / Input：8px。
- Capability Card / Download Card / Doc Card：8-12px，首版建议 8px 保持政企风格克制。
- Modal / Drawer / Mobile menu：12-16px。
- Pill / Tag：999px。
- Logo mark 外框如使用容器，建议 8px 或直接无容器。

### 13.8 Radio / Checkbox / 表单触控规则

Alpha UI 规范中 Radio 与 Checkbox 均包含 4 种状态：

- Default
- Default & Disabled
- Checked
- Checked & Disabled

尺寸规则：

- 可视尺寸不小于 20px。
- 触控区域不小于 40x40px。

官网应用：

- Contact / Support 表单中的单选、多选、同意条款必须符合 40x40px 触控区域。
- 错误状态应明确显示，不只依赖颜色。
- Disabled 状态需要降低对比度，但仍保持可识别。

### 13.9 设计语言调整结论

结合 Aifar Logo 与 Alpha UI 规范，官网设计方向需要从“通用政企 SaaS”进一步收敛为：

> Aifar 官网应使用蓝青渐变品牌标识、浅色背景、清晰网格、线性图标、克制圆角和明确交互状态，呈现轻量、标准、可信的协作产品门户。

对当前 `design.md` 前文的修订优先级：

1. 品牌主色应从原先偏青绿的 `#167C80` 调整为更贴近 Alpha/Aifar 的蓝色体系，青色作为渐变或辅助色。
2. Logo 不再使用占位字母方块，应以正式 Aifar mark 为准。
3. 卡片圆角可从 8px 保持起步，但 Figma 中应同时定义 12px 卡片方案供评审。
4. 分段控件、标签、列表导航、侧边导航应加入组件库。
5. 表单控件必须补充 Default / Focus / Error / Disabled / Success 状态。
6. 移动端所有可点区域按不小于 40x40px 检查。
