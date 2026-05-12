(function () {
  var languages = {
    "zh-CN": { label: "简体中文", shortLabel: "简", dir: "ltr" },
    "zh-HK": { label: "香港繁體", shortLabel: "繁", dir: "ltr" },
    ar: { label: "العربية", shortLabel: "ع", dir: "rtl" },
    fr: { label: "Français", shortLabel: "FR", dir: "ltr" }
  };

  var defaultLocale = "zh-CN";
  var storageKey = "aifar-locale";

  var common = {
    "Aifar": {
      "zh-CN": "Aifar",
      "zh-HK": "Aifar",
      ar: "Aifar",
      fr: "Aifar"
    },
    "Product": {
      "zh-CN": "产品",
      "zh-HK": "產品",
      ar: "المنتج",
      fr: "Produit"
    },
    "Downloads": {
      "zh-CN": "下载",
      "zh-HK": "下載",
      ar: "التنزيلات",
      fr: "Téléchargements"
    },
    "What's New": {
      "zh-CN": "最新动态",
      "zh-HK": "最新動態",
      ar: "ما الجديد",
      fr: "Nouveautés"
    },
    "Docs": {
      "zh-CN": "文档",
      "zh-HK": "文件",
      ar: "الوثائق",
      fr: "Docs"
    },
    "Support": {
      "zh-CN": "支持",
      "zh-HK": "支援",
      ar: "الدعم",
      fr: "Assistance"
    },
    "Contact": {
      "zh-CN": "联系",
      "zh-HK": "聯絡",
      ar: "تواصل معنا",
      fr: "Contact"
    },
    "Security": {
      "zh-CN": "安全",
      "zh-HK": "安全",
      ar: "الأمان",
      fr: "Sécurité"
    },
    "Documentation": {
      "zh-CN": "文档",
      "zh-HK": "文件",
      ar: "الوثائق",
      fr: "Documentation"
    },
    "© 2026 Aifar. All rights reserved.": {
      "zh-CN": "© 2026 Aifar。保留所有权利。",
      "zh-HK": "© 2026 Aifar。保留所有權利。",
      ar: "© 2026 Aifar. جميع الحقوق محفوظة.",
      fr: "© 2026 Aifar. Tous droits réservés."
    },
    "© 2026 Aifar.": {
      "zh-CN": "© 2026 Aifar。",
      "zh-HK": "© 2026 Aifar。",
      ar: "© 2026 Aifar.",
      fr: "© 2026 Aifar."
    },
    "Open navigation": {
      "zh-CN": "打开导航",
      "zh-HK": "開啟導覽",
      ar: "فتح التنقل",
      fr: "Ouvrir la navigation"
    },
    "Language": {
      "zh-CN": "语言",
      "zh-HK": "語言",
      ar: "اللغة",
      fr: "Langue"
    },
    "Aifar collaboration workspace preview showing desktop and mobile app screens": {
      "zh-CN": "Aifar 协同工作区预览，展示桌面端和移动端应用界面",
      "zh-HK": "Aifar 協同工作區預覽，展示桌面端和流動端應用介面",
      ar: "معاينة لمساحة تعاون Aifar تعرض شاشات تطبيق سطح المكتب والجوال",
      fr: "Aperçu de l'espace de collaboration Aifar avec écrans ordinateur et mobile"
    }
  };

  var pageCopy = {
    "/": {
      title: {
        "zh-CN": "Aifar | 面向政企团队的轻量标准协同平台",
        "zh-HK": "Aifar | 面向政企團隊的輕量標準協同平台",
        ar: "Aifar | تعاون قياسي خفيف لفرق الحكومة والمؤسسات",
        fr: "Aifar | Collaboration standard légère pour les équipes publiques et entreprises"
      },
      description: {
        "zh-CN": "Aifar 将聊天、会议、邮件、联系人、文档、流程和表单整合到一个轻量协同工作区。",
        "zh-HK": "Aifar 將聊天、會議、郵件、聯絡人、文件、流程和表單整合到一個輕量協同工作區。",
        ar: "يجمع Aifar الدردشة والاجتماعات والبريد وجهات الاتصال والمستندات وسير العمل والنماذج في مساحة تعاون خفيفة.",
        fr: "Aifar réunit chat, réunions, e-mail, contacts, documents, workflows et formulaires dans un espace de collaboration léger."
      },
      strings: {
        "Government and enterprise collaboration": {
          "zh-CN": "政企协同",
          "zh-HK": "政企協同",
          ar: "تعاون حكومي ومؤسسي",
          fr: "Collaboration publique et entreprise"
        },
        "Lightweight standard collaboration for teams that need clear communication, structured work, and reliable access across desktop and mobile clients.": {
          "zh-CN": "为需要清晰沟通、结构化工作和跨桌面及移动端可靠访问的团队，提供轻量标准协同能力。",
          "zh-HK": "為需要清晰溝通、結構化工作和跨桌面及流動端可靠存取的團隊，提供輕量標準協同能力。",
          ar: "تعاون قياسي خفيف للفرق التي تحتاج إلى تواصل واضح وعمل منظم ووصول موثوق عبر سطح المكتب والجوال.",
          fr: "Une collaboration standard légère pour les équipes qui ont besoin d'une communication claire, d'un travail structuré et d'un accès fiable sur ordinateur et mobile."
        },
        "Download Aifar": {
          "zh-CN": "下载 Aifar",
          "zh-HK": "下載 Aifar",
          ar: "تنزيل Aifar",
          fr: "Télécharger Aifar"
        },
        "Contact Sales": {
          "zh-CN": "联系销售",
          "zh-HK": "聯絡銷售",
          ar: "تواصل مع المبيعات",
          fr: "Contacter l'équipe commerciale"
        },
        "7": { "zh-CN": "7", "zh-HK": "7", ar: "7", fr: "7" },
        "Core collaboration modules": {
          "zh-CN": "核心协同模块",
          "zh-HK": "核心協同模組",
          ar: "وحدات تعاون أساسية",
          fr: "Modules de collaboration clés"
        },
        "5": { "zh-CN": "5", "zh-HK": "5", ar: "5", fr: "5" },
        "Client families supported": {
          "zh-CN": "支持的客户端类型",
          "zh-HK": "支援的客戶端類型",
          ar: "عائلات عملاء مدعومة",
          fr: "Familles de clients prises en charge"
        },
        "24/7": { "zh-CN": "24/7", "zh-HK": "24/7", ar: "24/7", fr: "24/7" },
        "Support-ready site structure": {
          "zh-CN": "面向支持的站点结构",
          "zh-HK": "面向支援的網站結構",
          ar: "هيكل موقع جاهز للدعم",
          fr: "Structure prête pour l'assistance"
        },
        "SEO": { "zh-CN": "SEO", "zh-HK": "SEO", ar: "SEO", fr: "SEO" },
        "Micro-lightweight, ready out of the box": {
          "zh-CN": "微轻量化开箱即用",
          "zh-HK": "微輕量化，開箱即用",
          ar: "خفيف جدا وجاهز للاستخدام فورا",
          fr: "Très léger et prêt à l'emploi"
        },
        "One workspace for standard collaboration": {
          "zh-CN": "一个标准协同工作区",
          "zh-HK": "一個標準協同工作區",
          ar: "مساحة عمل واحدة للتعاون القياسي",
          fr: "Un espace de travail pour la collaboration standard"
        },
        "Aifar covers the daily collaboration layer without forcing teams into a heavy, fragmented toolset.": {
          "zh-CN": "Aifar 覆盖日常协同层，不让团队被笨重、割裂的工具链拖累。",
          "zh-HK": "Aifar 覆蓋日常協同層，不讓團隊被笨重、割裂的工具鏈拖累。",
          ar: "يغطي Aifar طبقة التعاون اليومية من دون فرض مجموعة أدوات ثقيلة ومجزأة على الفرق.",
          fr: "Aifar couvre la collaboration quotidienne sans imposer aux équipes une pile d'outils lourde et fragmentée."
        },
        "Chat": { "zh-CN": "聊天", "zh-HK": "聊天", ar: "الدردشة", fr: "Chat" },
        "Organized team messaging for departments, projects, and cross-agency collaboration.": {
          "zh-CN": "面向部门、项目和跨组织协作的有序团队沟通。",
          "zh-HK": "面向部門、項目和跨組織協作的有序團隊溝通。",
          ar: "مراسلة منظمة للفرق والإدارات والمشاريع والتعاون بين الجهات.",
          fr: "Messagerie d'équipe organisée pour les services, projets et collaborations inter-organisations."
        },
        "Meeting": { "zh-CN": "会议", "zh-HK": "會議", ar: "الاجتماعات", fr: "Réunions" },
        "Simple meeting access for distributed teams across desktop, phone, and tablet.": {
          "zh-CN": "让分布式团队在桌面、手机和平板上轻松加入会议。",
          "zh-HK": "讓分散式團隊在桌面、手機和平板上輕鬆加入會議。",
          ar: "وصول بسيط إلى الاجتماعات للفرق الموزعة عبر الحاسوب والهاتف واللوحي.",
          fr: "Accès simple aux réunions pour les équipes distribuées, sur ordinateur, téléphone et tablette."
        },
        "Email": { "zh-CN": "邮件", "zh-HK": "郵件", ar: "البريد", fr: "E-mail" },
        "Integrated mail workflows that keep formal communication connected to work context.": {
          "zh-CN": "集成邮件流程，让正式沟通持续连接到工作上下文。",
          "zh-HK": "整合郵件流程，讓正式溝通持續連接到工作脈絡。",
          ar: "تدفقات بريد متكاملة تبقي التواصل الرسمي مرتبطا بسياق العمل.",
          fr: "Des flux e-mail intégrés qui relient les communications formelles au contexte de travail."
        },
        "Documents": { "zh-CN": "文档", "zh-HK": "文件", ar: "المستندات", fr: "Documents" },
        "Centralized document access for policies, procedures, guides, and shared materials.": {
          "zh-CN": "集中访问政策、流程、指南和共享材料。",
          "zh-HK": "集中存取政策、流程、指南和共享材料。",
          ar: "وصول مركزي إلى السياسات والإجراءات والأدلة والمواد المشتركة.",
          fr: "Accès centralisé aux politiques, procédures, guides et ressources partagées."
        },
        "Built for managed teams": {
          "zh-CN": "为可管理团队而构建",
          "zh-HK": "為可管理團隊而構建",
          ar: "مصمم للفرق المدارة",
          fr: "Conçu pour les équipes gérées"
        },
        "The website is planned as the public entry point for product introduction, downloads, updates, documentation, and technical support.": {
          "zh-CN": "网站作为公开入口，承载产品介绍、下载、更新、文档和技术支持。",
          "zh-HK": "網站作為公開入口，承載產品介紹、下載、更新、文件和技術支援。",
          ar: "تم تخطيط الموقع كنقطة دخول عامة للتعريف بالمنتج والتنزيلات والتحديثات والوثائق والدعم الفني.",
          fr: "Le site sert de point d'entrée public pour la présentation du produit, les téléchargements, les mises à jour, la documentation et le support technique."
        },
        "Cross-client access": {
          "zh-CN": "跨客户端访问",
          "zh-HK": "跨客戶端存取",
          ar: "وصول عبر العملاء",
          fr: "Accès multi-clients"
        },
        "PC, iOS, Android phone, Android pad, and Mac Preview are represented from the first release of the site.": {
          "zh-CN": "首版站点即覆盖 PC、iOS、Android 手机、Android 平板和 Mac 预览版。",
          "zh-HK": "首版網站即覆蓋 PC、iOS、Android 手機、Android 平板和 Mac 預覽版。",
          ar: "يشمل الإصدار الأول من الموقع PC وiOS وهاتف Android ولوحي Android وMac Preview.",
          fr: "PC, iOS, Android phone, Android pad et Mac Preview sont présents dès la première version du site."
        },
        "Operational content": {
          "zh-CN": "运营内容",
          "zh-HK": "營運內容",
          ar: "محتوى تشغيلي",
          fr: "Contenus opérationnels"
        },
        "What's New, documentation, support, and download pages are separated so each area can be maintained independently.": {
          "zh-CN": "最新动态、文档、支持和下载页面相互独立，便于分别维护。",
          "zh-HK": "最新動態、文件、支援和下載頁面相互獨立，便於分別維護。",
          ar: "تم فصل صفحات المستجدات والوثائق والدعم والتنزيلات حتى يمكن صيانة كل مجال بشكل مستقل.",
          fr: "Les pages nouveautés, documentation, assistance et téléchargements sont séparées pour faciliter leur maintenance."
        },
        "Future Aifar integration": {
          "zh-CN": "未来 Aifar 集成",
          "zh-HK": "未來 Aifar 整合",
          ar: "تكاملات Aifar المستقبلية",
          fr: "Intégrations Aifar futures"
        },
        "Contact forms, support requests, release notes, and documents can later connect to Aifar Forms, Workflow, Docs, Chat, Meeting, Email, and Contact.": {
          "zh-CN": "联系表单、支持请求、发布说明和文档后续可连接到 Aifar 表单、流程、文档、聊天、会议、邮件和联系人。",
          "zh-HK": "聯絡表單、支援請求、發布說明和文件後續可連接到 Aifar 表單、流程、文件、聊天、會議、郵件和聯絡人。",
          ar: "يمكن لاحقا ربط نماذج التواصل وطلبات الدعم وملاحظات الإصدار والمستندات بنماذج Aifar وسير العمل والوثائق والدردشة والاجتماعات والبريد وجهات الاتصال.",
          fr: "Les formulaires de contact, demandes d'assistance, notes de version et documents pourront être connectés à Aifar Forms, Workflow, Docs, Chat, Meeting, Email et Contact."
        },
        "Latest updates": {
          "zh-CN": "最新更新",
          "zh-HK": "最新更新",
          ar: "آخر التحديثات",
          fr: "Dernières mises à jour"
        },
        "View all": {
          "zh-CN": "查看全部",
          "zh-HK": "查看全部",
          ar: "عرض الكل",
          fr: "Tout voir"
        },
        "Website foundation": {
          "zh-CN": "网站基础结构",
          "zh-HK": "網站基礎結構",
          ar: "أساس الموقع",
          fr: "Fondation du site"
        },
        "Initial public website structure for product introduction, downloads, documentation, support, and contact.": {
          "zh-CN": "用于产品介绍、下载、文档、支持和联系的首版公开网站结构。",
          "zh-HK": "用於產品介紹、下載、文件、支援和聯絡的首版公開網站結構。",
          ar: "هيكل أولي للموقع العام للتعريف بالمنتج والتنزيلات والوثائق والدعم والتواصل.",
          fr: "Structure initiale du site public pour la présentation du produit, les téléchargements, la documentation, l'assistance et le contact."
        },
        "Planning": { "zh-CN": "规划中", "zh-HK": "規劃中", ar: "تخطيط", fr: "Planification" },
        "Mac client preview": {
          "zh-CN": "Mac 客户端预览版",
          "zh-HK": "Mac 客戶端預覽版",
          ar: "معاينة عميل Mac",
          fr: "Aperçu du client Mac"
        },
        "Download area includes a preview channel for the Mac client.": {
          "zh-CN": "下载区域包含 Mac 客户端预览通道。",
          "zh-HK": "下載區域包含 Mac 客戶端預覽通道。",
          ar: "تتضمن منطقة التنزيل قناة معاينة لعميل Mac.",
          fr: "La zone de téléchargement inclut un canal d'aperçu pour le client Mac."
        },
        "Preview": { "zh-CN": "预览版", "zh-HK": "預覽版", ar: "معاينة", fr: "Aperçu" },
        "Docs hub prepared": {
          "zh-CN": "文档中心已准备",
          "zh-HK": "文件中心已準備",
          ar: "مركز الوثائق جاهز",
          fr: "Centre docs préparé"
        },
        "Documentation entry points are ready for user guides, admin guides, deployment notes, and support policies.": {
          "zh-CN": "已准备用户指南、管理员指南、部署说明和支持政策入口。",
          "zh-HK": "已準備用戶指南、管理員指南、部署說明和支援政策入口。",
          ar: "نقاط دخول الوثائق جاهزة لأدلة المستخدم والمسؤول وملاحظات النشر وسياسات الدعم.",
          fr: "Les points d'entrée de documentation sont prêts pour les guides utilisateurs, administrateurs, notes de déploiement et politiques d'assistance."
        },
        "Ready for launch operations": {
          "zh-CN": "准备好支持上线运营",
          "zh-HK": "準備好支援上線營運",
          ar: "جاهز لعمليات الإطلاق",
          fr: "Prêt pour les opérations de lancement"
        },
        "Start with a clear website. Grow into a connected Aifar service portal.": {
          "zh-CN": "从清晰网站开始，逐步成长为连接 Aifar 的服务门户。",
          "zh-HK": "從清晰網站開始，逐步成長為連接 Aifar 的服務門戶。",
          ar: "ابدأ بموقع واضح، ثم تطور إلى بوابة خدمة متصلة مع Aifar.",
          fr: "Commencez avec un site clair, puis évoluez vers un portail de services connecté à Aifar."
        },
        "The first version stays lightweight and deployable. Future versions can connect forms, workflows, documents, contact records, and support conversations directly to Aifar.": {
          "zh-CN": "首版保持轻量、易部署。未来版本可将表单、流程、文档、联系人记录和支持会话直接连接到 Aifar。",
          "zh-HK": "首版保持輕量、易部署。未來版本可將表單、流程、文件、聯絡人記錄和支援對話直接連接到 Aifar。",
          ar: "يبقى الإصدار الأول خفيفا وسهل النشر. ويمكن للإصدارات المستقبلية ربط النماذج وسير العمل والمستندات وسجلات جهات الاتصال ومحادثات الدعم مباشرة مع Aifar.",
          fr: "La première version reste légère et déployable. Les versions futures pourront connecter formulaires, workflows, documents, fiches contacts et conversations de support directement à Aifar."
        },
        "Get Aifar": {
          "zh-CN": "获取 Aifar",
          "zh-HK": "取得 Aifar",
          ar: "احصل على Aifar",
          fr: "Obtenir Aifar"
        },
        "Technical Support": {
          "zh-CN": "技术支持",
          "zh-HK": "技術支援",
          ar: "الدعم الفني",
          fr: "Support technique"
        }
      }
    }
  };

  var sharedProductStrings = {
    "Product": common.Product,
    "Standard collaboration without unnecessary complexity.": {
      "zh-CN": "标准协同，不增加不必要的复杂度。",
      "zh-HK": "標準協同，不增加不必要的複雜度。",
      ar: "تعاون قياسي من دون تعقيد غير ضروري.",
      fr: "Une collaboration standard sans complexité inutile."
    },
    "Aifar combines communication, structured work, and business records into one lightweight workspace.": {
      "zh-CN": "Aifar 将沟通、结构化工作和业务记录整合到一个轻量工作区。",
      "zh-HK": "Aifar 將溝通、結構化工作和業務記錄整合到一個輕量工作區。",
      ar: "يجمع Aifar التواصل والعمل المنظم وسجلات الأعمال في مساحة عمل خفيفة واحدة.",
      fr: "Aifar réunit communication, travail structuré et dossiers métiers dans un espace léger."
    },
    "Team channels, direct communication, and persistent work context.": {
      "zh-CN": "团队频道、直接沟通和持续保留的工作上下文。",
      "zh-HK": "團隊頻道、直接溝通和持續保留的工作脈絡。",
      ar: "قنوات فرق وتواصل مباشر وسياق عمل مستمر.",
      fr: "Canaux d'équipe, échanges directs et contexte de travail persistant."
    },
    "Meeting access for cross-location teams on desktop and mobile clients.": {
      "zh-CN": "为跨地点团队提供桌面和移动端会议访问。",
      "zh-HK": "為跨地點團隊提供桌面和流動端會議存取。",
      ar: "وصول إلى الاجتماعات للفرق متعددة المواقع على عملاء سطح المكتب والجوال.",
      fr: "Accès aux réunions pour les équipes multi-sites sur ordinateur et mobile."
    },
    "Formal communication connected to contacts, documents, and work records.": {
      "zh-CN": "将正式沟通连接到联系人、文档和工作记录。",
      "zh-HK": "將正式溝通連接到聯絡人、文件和工作記錄。",
      ar: "تواصل رسمي مرتبط بجهات الاتصال والمستندات وسجلات العمل.",
      fr: "Communications formelles reliées aux contacts, documents et dossiers de travail."
    },
    "Contact": common.Contact,
    "Organized people and organization records for enterprise communication.": {
      "zh-CN": "面向企业沟通的人和组织记录管理。",
      "zh-HK": "面向企業溝通的人和組織記錄管理。",
      ar: "سجلات منظمة للأشخاص والمؤسسات من أجل التواصل المؤسسي.",
      fr: "Fiches personnes et organisations structurées pour les échanges d'entreprise."
    },
    "Guides, policies, project materials, and shared resources in one place.": {
      "zh-CN": "在一处管理指南、政策、项目材料和共享资源。",
      "zh-HK": "在一處管理指南、政策、項目材料和共享資源。",
      ar: "أدلة وسياسات ومواد مشاريع وموارد مشتركة في مكان واحد.",
      fr: "Guides, politiques, ressources projet et contenus partagés au même endroit."
    },
    "Workflow": { "zh-CN": "流程", "zh-HK": "流程", ar: "سير العمل", fr: "Workflow" },
    "Structured approvals and operational flows for managed teams.": {
      "zh-CN": "为可管理团队提供结构化审批和运营流程。",
      "zh-HK": "為可管理團隊提供結構化審批和營運流程。",
      ar: "موافقات منظمة وتدفقات تشغيلية للفرق المدارة.",
      fr: "Validations structurées et flux opérationnels pour les équipes gérées."
    },
    "Forms": { "zh-CN": "表单", "zh-HK": "表單", ar: "النماذج", fr: "Formulaires" },
    "Simple data collection for contact requests, support, and internal processes.": {
      "zh-CN": "用于联系请求、支持和内部流程的简洁数据收集。",
      "zh-HK": "用於聯絡請求、支援和內部流程的簡潔數據收集。",
      ar: "جمع بيانات بسيط لطلبات التواصل والدعم والعمليات الداخلية.",
      fr: "Collecte de données simple pour les demandes de contact, le support et les processus internes."
    }
  };

  Object.assign(pageCopy, {
    "/product/": {
      title: {
        "zh-CN": "产品 | Aifar",
        "zh-HK": "產品 | Aifar",
        ar: "المنتج | Aifar",
        fr: "Produit | Aifar"
      },
      description: {
        "zh-CN": "了解 Aifar 的聊天、会议、邮件、联系人、文档、流程和表单能力。",
        "zh-HK": "了解 Aifar 的聊天、會議、郵件、聯絡人、文件、流程和表單能力。",
        ar: "استكشف ميزات Aifar بما في ذلك الدردشة والاجتماعات والبريد وجهات الاتصال والمستندات وسير العمل والنماذج.",
        fr: "Découvrez les fonctionnalités Aifar : chat, réunions, e-mail, contacts, documents, workflows et formulaires."
      },
      strings: sharedProductStrings
    },
    "/downloads/": {
      title: {
        "zh-CN": "下载 | Aifar",
        "zh-HK": "下載 | Aifar",
        ar: "التنزيلات | Aifar",
        fr: "Téléchargements | Aifar"
      },
      description: {
        "zh-CN": "下载适用于 PC、iOS、Android 手机、Android 平板和 Mac 预览版的 Aifar。",
        "zh-HK": "下載適用於 PC、iOS、Android 手機、Android 平板和 Mac 預覽版的 Aifar。",
        ar: "نزّل Aifar لأجهزة PC وiOS وهاتف Android ولوحي Android وMac Preview.",
        fr: "Téléchargez Aifar pour PC, iOS, téléphone Android, tablette Android et Mac Preview."
      },
      strings: {
        "Downloads": common.Downloads,
        "Get Aifar on the devices your teams already use.": {
          "zh-CN": "在团队已使用的设备上获取 Aifar。",
          "zh-HK": "在團隊已使用的裝置上取得 Aifar。",
          ar: "احصل على Aifar على الأجهزة التي تستخدمها فرقك بالفعل.",
          fr: "Installez Aifar sur les appareils que vos équipes utilisent déjà."
        },
        "Download links are placeholders for the first website skeleton and can be connected to release storage or Aifar-managed version records later.": {
          "zh-CN": "下载链接目前是首版网站骨架的占位内容，后续可连接到发布存储或 Aifar 管理的版本记录。",
          "zh-HK": "下載連結目前是首版網站骨架的佔位內容，後續可連接到發布儲存或 Aifar 管理的版本記錄。",
          ar: "روابط التنزيل عناصر مؤقتة للهيكل الأول للموقع ويمكن ربطها لاحقا بتخزين الإصدارات أو سجلات الإصدارات التي يديرها Aifar.",
          fr: "Les liens de téléchargement sont des emplacements réservés et pourront être connectés à un stockage de versions ou à des enregistrements gérés par Aifar."
        },
        "PC Client": { "zh-CN": "PC 客户端", "zh-HK": "PC 客戶端", ar: "عميل PC", fr: "Client PC" },
        "Windows desktop client for daily collaboration.": {
          "zh-CN": "用于日常协同的 Windows 桌面客户端。",
          "zh-HK": "用於日常協同的 Windows 桌面客戶端。",
          ar: "عميل سطح مكتب Windows للتعاون اليومي.",
          fr: "Client Windows pour la collaboration quotidienne."
        },
        "Download": { "zh-CN": "下载", "zh-HK": "下載", ar: "تنزيل", fr: "Télécharger" },
        "iOS Client": { "zh-CN": "iOS 客户端", "zh-HK": "iOS 客戶端", ar: "عميل iOS", fr: "Client iOS" },
        "Mobile access for iPhone and iPad users.": {
          "zh-CN": "为 iPhone 和 iPad 用户提供移动访问。",
          "zh-HK": "為 iPhone 和 iPad 用戶提供流動存取。",
          ar: "وصول جوال لمستخدمي iPhone وiPad.",
          fr: "Accès mobile pour les utilisateurs iPhone et iPad."
        },
        "App Store": { "zh-CN": "App Store", "zh-HK": "App Store", ar: "App Store", fr: "App Store" },
        "Android Phone": { "zh-CN": "Android 手机", "zh-HK": "Android 手機", ar: "هاتف Android", fr: "Téléphone Android" },
        "Android client optimized for phone screens.": {
          "zh-CN": "针对手机屏幕优化的 Android 客户端。",
          "zh-HK": "針對手機螢幕優化的 Android 客戶端。",
          ar: "عميل Android محسّن لشاشات الهواتف.",
          fr: "Client Android optimisé pour les écrans de téléphone."
        },
        "Download APK": { "zh-CN": "下载 APK", "zh-HK": "下載 APK", ar: "تنزيل APK", fr: "Télécharger l'APK" },
        "Android Pad": { "zh-CN": "Android 平板", "zh-HK": "Android 平板", ar: "لوحي Android", fr: "Tablette Android" },
        "Tablet-ready Android collaboration experience.": {
          "zh-CN": "适配平板的 Android 协同体验。",
          "zh-HK": "適配平板的 Android 協同體驗。",
          ar: "تجربة تعاون Android جاهزة للأجهزة اللوحية.",
          fr: "Expérience de collaboration Android adaptée aux tablettes."
        },
        "Mac Client": { "zh-CN": "Mac 客户端", "zh-HK": "Mac 客戶端", ar: "عميل Mac", fr: "Client Mac" },
        "Current channel: preview version.": {
          "zh-CN": "当前通道：预览版。",
          "zh-HK": "目前通道：預覽版。",
          ar: "القناة الحالية: إصدار معاينة.",
          fr: "Canal actuel : version d'aperçu."
        },
        "Preview": { "zh-CN": "预览版", "zh-HK": "預覽版", ar: "معاينة", fr: "Aperçu" }
      }
    },
    "/docs/": {
      title: {
        "zh-CN": "文档 | Aifar",
        "zh-HK": "文件 | Aifar",
        ar: "الوثائق | Aifar",
        fr: "Documentation | Aifar"
      },
      description: {
        "zh-CN": "Aifar 文档中心，面向用户指南、管理员指南、部署说明、安全和支持政策。",
        "zh-HK": "Aifar 文件中心，面向用戶指南、管理員指南、部署說明、安全和支援政策。",
        ar: "مركز وثائق Aifar لأدلة المستخدمين والمسؤولين وملاحظات النشر والأمان وسياسات الدعم.",
        fr: "Centre de documentation Aifar pour guides utilisateurs, administrateurs, notes de déploiement, sécurité et support."
      },
      strings: {
        "Documentation": common.Documentation,
        "Guides for users, administrators, and support teams.": {
          "zh-CN": "面向用户、管理员和支持团队的指南。",
          "zh-HK": "面向用戶、管理員和支援團隊的指南。",
          ar: "أدلة للمستخدمين والمسؤولين وفرق الدعم.",
          fr: "Guides pour utilisateurs, administrateurs et équipes support."
        },
        "The docs hub is ready for product materials and can later be backed by Aifar Docs or another content system.": {
          "zh-CN": "文档中心已准备承载产品资料，后续可接入 Aifar Docs 或其他内容系统。",
          "zh-HK": "文件中心已準備承載產品資料，後續可接入 Aifar Docs 或其他內容系統。",
          ar: "مركز الوثائق جاهز لمواد المنتج ويمكن دعمه لاحقا بواسطة Aifar Docs أو نظام محتوى آخر.",
          fr: "Le centre docs est prêt pour les contenus produit et pourra être relié à Aifar Docs ou à un autre système de contenu."
        },
        "Getting Started": { "zh-CN": "快速开始", "zh-HK": "快速開始", ar: "بدء الاستخدام", fr: "Bien démarrer" },
        "Core concepts, account access, and first-use checklist.": {
          "zh-CN": "核心概念、账号访问和首次使用清单。",
          "zh-HK": "核心概念、帳號存取和首次使用清單。",
          ar: "المفاهيم الأساسية والوصول إلى الحساب وقائمة الاستخدام الأول.",
          fr: "Concepts clés, accès au compte et checklist de première utilisation."
        },
        "User guide": { "zh-CN": "用户指南", "zh-HK": "用戶指南", ar: "دليل المستخدم", fr: "Guide utilisateur" },
        "Client Installation": { "zh-CN": "客户端安装", "zh-HK": "客戶端安裝", ar: "تثبيت العميل", fr: "Installation client" },
        "Install and update Aifar across PC, iOS, Android, and Mac Preview.": {
          "zh-CN": "在 PC、iOS、Android 和 Mac 预览版上安装与更新 Aifar。",
          "zh-HK": "在 PC、iOS、Android 和 Mac 預覽版上安裝與更新 Aifar。",
          ar: "ثبّت وحدّث Aifar عبر PC وiOS وAndroid وMac Preview.",
          fr: "Installer et mettre à jour Aifar sur PC, iOS, Android et Mac Preview."
        },
        "Setup": { "zh-CN": "设置", "zh-HK": "設定", ar: "الإعداد", fr: "Configuration" },
        "Administrator Guide": { "zh-CN": "管理员指南", "zh-HK": "管理員指南", ar: "دليل المسؤول", fr: "Guide administrateur" },
        "Team structure, access management, contacts, and operational governance.": {
          "zh-CN": "团队结构、访问管理、联系人和运营治理。",
          "zh-HK": "團隊結構、存取管理、聯絡人和營運治理。",
          ar: "هيكل الفريق وإدارة الوصول وجهات الاتصال والحوكمة التشغيلية.",
          fr: "Structure d'équipe, gestion des accès, contacts et gouvernance opérationnelle."
        },
        "Admin": { "zh-CN": "管理员", "zh-HK": "管理員", ar: "مسؤول", fr: "Admin" },
        "Security Overview": { "zh-CN": "安全概览", "zh-HK": "安全概覽", ar: "نظرة عامة على الأمان", fr: "Vue sécurité" },
        "Security posture, privacy handling, and enterprise deployment notes.": {
          "zh-CN": "安全姿态、隐私处理和企业部署说明。",
          "zh-HK": "安全狀態、私隱處理和企業部署說明。",
          ar: "وضع الأمان ومعالجة الخصوصية وملاحظات النشر المؤسسي.",
          fr: "Posture de sécurité, gestion de la confidentialité et notes de déploiement entreprise."
        },
        "Security": common.Security
      }
    }
  });

  pageCopy["/support/"] = {
    title: { "zh-CN": "支持 | Aifar", "zh-HK": "支援 | Aifar", ar: "الدعم | Aifar", fr: "Assistance | Aifar" },
    description: {
      "zh-CN": "获取 Aifar 产品、客户端、文档、部署和账号访问的技术支持。",
      "zh-HK": "取得 Aifar 產品、客戶端、文件、部署和帳號存取的技術支援。",
      ar: "احصل على الدعم الفني لمنتجات Aifar والعملاء والوثائق والنشر والوصول إلى الحساب.",
      fr: "Obtenez une assistance technique pour les produits, clients, documents, déploiements et accès Aifar."
    },
    strings: {
      "Support": common.Support,
      "Technical support for Aifar teams.": { "zh-CN": "面向 Aifar 团队的技术支持。", "zh-HK": "面向 Aifar 團隊的技術支援。", ar: "دعم فني لفرق Aifar.", fr: "Support technique pour les équipes Aifar." },
      "This page is prepared for account, client, deployment, and product support workflows.": {
        "zh-CN": "此页面面向账号、客户端、部署和产品支持流程而准备。",
        "zh-HK": "此頁面面向帳號、客戶端、部署和產品支援流程而準備。",
        ar: "تم إعداد هذه الصفحة لتدفقات دعم الحساب والعميل والنشر والمنتج.",
        fr: "Cette page est préparée pour les flux d'assistance compte, client, déploiement et produit."
      },
      "Account Access": { "zh-CN": "账号访问", "zh-HK": "帳號存取", ar: "الوصول إلى الحساب", fr: "Accès au compte" },
      "Help with login, organization access, and account readiness.": {
        "zh-CN": "协助处理登录、组织访问和账号准备。",
        "zh-HK": "協助處理登入、組織存取和帳號準備。",
        ar: "مساعدة في تسجيل الدخول والوصول إلى المؤسسة وجاهزية الحساب.",
        fr: "Aide à la connexion, à l'accès organisation et à la préparation du compte."
      },
      "Installation": { "zh-CN": "安装", "zh-HK": "安裝", ar: "التثبيت", fr: "Installation" },
      "Client setup guidance for desktop and mobile users.": {
        "zh-CN": "为桌面和移动端用户提供客户端设置指南。",
        "zh-HK": "為桌面和流動端用戶提供客戶端設定指南。",
        ar: "إرشادات إعداد العميل لمستخدمي سطح المكتب والجوال.",
        fr: "Guides de configuration client pour les utilisateurs ordinateur et mobile."
      },
      "Technical Issue": { "zh-CN": "技术问题", "zh-HK": "技術問題", ar: "مشكلة فنية", fr: "Incident technique" },
      "Structured support requests can later route through Aifar Forms and Workflow.": {
        "zh-CN": "结构化支持请求后续可通过 Aifar 表单和流程流转。",
        "zh-HK": "結構化支援請求後續可透過 Aifar 表單和流程流轉。",
        ar: "يمكن لاحقا توجيه طلبات الدعم المنظمة عبر نماذج Aifar وسير العمل.",
        fr: "Les demandes structurées pourront ensuite passer par Aifar Forms et Workflow."
      }
    }
  };

  pageCopy["/contact/"] = {
    title: { "zh-CN": "联系 | Aifar", "zh-HK": "聯絡 | Aifar", ar: "تواصل معنا | Aifar", fr: "Contact | Aifar" },
    description: {
      "zh-CN": "联系 Aifar，咨询政企协同产品、技术支持和合作事宜。",
      "zh-HK": "聯絡 Aifar，諮詢政企協同產品、技術支援和合作事宜。",
      ar: "تواصل مع Aifar لاستفسارات منتجات التعاون الحكومي والمؤسسي والدعم الفني والشراكات.",
      fr: "Contactez Aifar pour les demandes produit, support technique et partenariats."
    },
    strings: {
      "Contact": common.Contact,
      "Talk with the Aifar team.": { "zh-CN": "与 Aifar 团队沟通。", "zh-HK": "與 Aifar 團隊溝通。", ar: "تحدث مع فريق Aifar.", fr: "Échanger avec l'équipe Aifar." },
      "Use this placeholder form for the first website version. Later it can submit directly into Aifar Forms, Workflow, Contact, and Email.": {
        "zh-CN": "首版网站先使用此占位表单，后续可直接提交到 Aifar 表单、流程、联系人和邮件。",
        "zh-HK": "首版網站先使用此佔位表單，後續可直接提交到 Aifar 表單、流程、聯絡人和郵件。",
        ar: "استخدم هذا النموذج المؤقت في الإصدار الأول من الموقع. ويمكنه لاحقا الإرسال مباشرة إلى نماذج Aifar وسير العمل وجهات الاتصال والبريد.",
        fr: "Ce formulaire temporaire sert la première version du site. Il pourra ensuite envoyer directement vers Aifar Forms, Workflow, Contact et Email."
      },
      "Name": { "zh-CN": "姓名", "zh-HK": "姓名", ar: "الاسم", fr: "Nom" },
      "Work email": { "zh-CN": "工作邮箱", "zh-HK": "工作電郵", ar: "بريد العمل", fr: "E-mail professionnel" },
      "Organization": { "zh-CN": "组织", "zh-HK": "機構", ar: "المؤسسة", fr: "Organisation" },
      "Request type": { "zh-CN": "请求类型", "zh-HK": "請求類型", ar: "نوع الطلب", fr: "Type de demande" },
      "Product inquiry": { "zh-CN": "产品咨询", "zh-HK": "產品諮詢", ar: "استفسار عن المنتج", fr: "Demande produit" },
      "Technical support": { "zh-CN": "技术支持", "zh-HK": "技術支援", ar: "دعم فني", fr: "Support technique" },
      "Partnership": { "zh-CN": "合作", "zh-HK": "合作", ar: "شراكة", fr: "Partenariat" },
      "Other": { "zh-CN": "其他", "zh-HK": "其他", ar: "أخرى", fr: "Autre" },
      "Message": { "zh-CN": "留言", "zh-HK": "訊息", ar: "الرسالة", fr: "Message" },
      "Submit request": { "zh-CN": "提交请求", "zh-HK": "提交請求", ar: "إرسال الطلب", fr: "Envoyer la demande" }
    }
  };

  pageCopy["/security/"] = {
    title: { "zh-CN": "安全 | Aifar", "zh-HK": "安全 | Aifar", ar: "الأمان | Aifar", fr: "Sécurité | Aifar" },
    description: {
      "zh-CN": "Aifar 面向政企协同环境的安全与合规概览。",
      "zh-HK": "Aifar 面向政企協同環境的安全與合規概覽。",
      ar: "نظرة عامة على أمان وامتثال Aifar لبيئات التعاون الحكومية والمؤسسية.",
      fr: "Présentation sécurité et conformité Aifar pour les environnements publics et entreprises."
    },
    strings: {
      "Security": common.Security,
      "Designed for managed collaboration environments.": { "zh-CN": "为可管理协同环境而设计。", "zh-HK": "為可管理協同環境而設計。", ar: "مصمم لبيئات التعاون المدارة.", fr: "Conçu pour les environnements de collaboration gérés." },
      "This page gives Aifar a dedicated place for security, privacy, governance, and deployment messaging as the product documentation matures.": {
        "zh-CN": "随着产品文档完善，此页面将承载 Aifar 的安全、隐私、治理和部署信息。",
        "zh-HK": "隨著產品文件完善，此頁面將承載 Aifar 的安全、私隱、治理和部署資訊。",
        ar: "تمنح هذه الصفحة Aifar مساحة مخصصة لرسائل الأمان والخصوصية والحوكمة والنشر مع نضج وثائق المنتج.",
        fr: "Cette page donne à Aifar un espace dédié aux messages de sécurité, confidentialité, gouvernance et déploiement à mesure que la documentation mûrit."
      },
      "Governance": { "zh-CN": "治理", "zh-HK": "治理", ar: "الحوكمة", fr: "Gouvernance" },
      "Clear ownership, structured communication, and maintainable content for enterprise operations.": {
        "zh-CN": "为企业运营提供清晰权责、结构化沟通和可维护内容。",
        "zh-HK": "為企業營運提供清晰權責、結構化溝通和可維護內容。",
        ar: "ملكية واضحة وتواصل منظم ومحتوى قابل للصيانة للعمليات المؤسسية.",
        fr: "Responsabilités claires, communication structurée et contenus maintenables pour les opérations."
      },
      "Privacy": { "zh-CN": "隐私", "zh-HK": "私隱", ar: "الخصوصية", fr: "Confidentialité" },
      "Prepared space for privacy policies, data handling, retention, and customer-specific terms.": {
        "zh-CN": "预留隐私政策、数据处理、留存和客户专属条款空间。",
        "zh-HK": "預留私隱政策、數據處理、保留和客戶專屬條款空間。",
        ar: "مساحة مهيأة لسياسات الخصوصية ومعالجة البيانات والاحتفاظ بها والشروط الخاصة بالعملاء.",
        fr: "Espace prêt pour les politiques de confidentialité, le traitement des données, la conservation et les conditions propres aux clients."
      },
      "Deployment": { "zh-CN": "部署", "zh-HK": "部署", ar: "النشر", fr: "Déploiement" },
      "Ready for deployment notes, client update policy, and environment-specific documentation.": {
        "zh-CN": "可承载部署说明、客户端更新策略和特定环境文档。",
        "zh-HK": "可承載部署說明、客戶端更新策略和特定環境文件。",
        ar: "جاهز لملاحظات النشر وسياسة تحديث العملاء والوثائق الخاصة بالبيئة.",
        fr: "Prêt pour les notes de déploiement, la politique de mise à jour client et la documentation par environnement."
      }
    }
  };

  pageCopy["/whats-new/"] = {
    title: { "zh-CN": "最新动态 | Aifar", "zh-HK": "最新動態 | Aifar", ar: "ما الجديد | Aifar", fr: "Nouveautés | Aifar" },
    description: {
      "zh-CN": "阅读 Aifar 发布说明、产品更新、客户端变化和文档公告。",
      "zh-HK": "閱讀 Aifar 發布說明、產品更新、客戶端變更和文件公告。",
      ar: "اقرأ ملاحظات إصدار Aifar وتحديثات المنتج وتغييرات العملاء وإعلانات الوثائق.",
      fr: "Consultez les notes de version, mises à jour produit, changements client et annonces documentaires Aifar."
    },
    strings: {
      "What's New": common["What's New"],
      "Product updates and release notes.": { "zh-CN": "产品更新与发布说明。", "zh-HK": "產品更新與發布說明。", ar: "تحديثات المنتج وملاحظات الإصدار.", fr: "Mises à jour produit et notes de version." },
      "Use this area to publish release highlights, client updates, fixes, and operational announcements.": {
        "zh-CN": "在此发布版本亮点、客户端更新、修复和运营公告。",
        "zh-HK": "在此發布版本亮點、客戶端更新、修復和營運公告。",
        ar: "استخدم هذه المنطقة لنشر أبرز الإصدارات وتحديثات العملاء والإصلاحات والإعلانات التشغيلية.",
        fr: "Utilisez cet espace pour publier les temps forts de version, mises à jour client, correctifs et annonces opérationnelles."
      },
      "May 2026 Website foundation": { "zh-CN": "2026 年 5 月网站基础结构", "zh-HK": "2026 年 5 月網站基礎結構", ar: "مايو 2026 أساس الموقع", fr: "Mai 2026 Fondation du site" },
      "Initial public website structure prepared for Aifar launch content.": {
        "zh-CN": "已为 Aifar 上线内容准备首版公开网站结构。",
        "zh-HK": "已為 Aifar 上線內容準備首版公開網站結構。",
        ar: "تم إعداد هيكل الموقع العام الأولي لمحتوى إطلاق Aifar.",
        fr: "Structure initiale du site public préparée pour le contenu de lancement Aifar."
      },
      "Website": { "zh-CN": "网站", "zh-HK": "網站", ar: "الموقع", fr: "Site web" },
      "Mac Preview channel": { "zh-CN": "Mac 预览通道", "zh-HK": "Mac 預覽通道", ar: "قناة Mac Preview", fr: "Canal Mac Preview" },
      "The downloads page includes a dedicated Mac Preview entry for early client availability.": {
        "zh-CN": "下载页面包含专门的 Mac 预览版入口，便于早期客户端发布。",
        "zh-HK": "下載頁面包含專門的 Mac 預覽版入口，便於早期客戶端發布。",
        ar: "تتضمن صفحة التنزيلات مدخلا مخصصا لـ Mac Preview لتوفر العميل المبكر.",
        fr: "La page téléchargements inclut une entrée Mac Preview dédiée aux premières disponibilités client."
      },
      "Client": { "zh-CN": "客户端", "zh-HK": "客戶端", ar: "العميل", fr: "Client" },
      "Documentation hub": { "zh-CN": "文档中心", "zh-HK": "文件中心", ar: "مركز الوثائق", fr: "Centre documentation" },
      "Docs entry points are ready for product, administrator, deployment, and security materials.": {
        "zh-CN": "文档入口已准备承载产品、管理员、部署和安全资料。",
        "zh-HK": "文件入口已準備承載產品、管理員、部署和安全資料。",
        ar: "نقاط دخول الوثائق جاهزة لمواد المنتج والمسؤول والنشر والأمان.",
        fr: "Les entrées documentation sont prêtes pour les contenus produit, administrateur, déploiement et sécurité."
      },
      "Docs": common.Docs
    }
  };

  function currentPath() {
    var path = window.location.pathname.replace(/\/index\.html$/, "/");
    return path === "" ? "/" : path;
  }

  function mergedStrings(path) {
    return Object.assign({}, common, pageCopy["/"].strings, (pageCopy[path] && pageCopy[path].strings) || {});
  }

  function localeFromStorage() {
    var saved = localStorage.getItem(storageKey);
    return languages[saved] ? saved : defaultLocale;
  }

  function translateValue(value, locale, dictionary) {
    var trimmed = value.replace(/\s+/g, " ").trim();
    if (!trimmed || !dictionary[trimmed] || !dictionary[trimmed][locale]) {
      return value;
    }
    return dictionary[trimmed][locale];
  }

  function translateTextNodes(root, locale, dictionary) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest("script, style")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (!node.__aifarSourceText) node.__aifarSourceText = node.nodeValue.replace(/\s+/g, " ").trim();
      var translated = translateValue(node.__aifarSourceText, locale, dictionary);
      if (translated !== node.nodeValue.trim()) node.nodeValue = translated;
    });
  }

  function translateAttributes(root, locale, dictionary) {
    root.querySelectorAll("[alt], [aria-label]").forEach(function (element) {
      ["alt", "aria-label"].forEach(function (name) {
        if (!element.hasAttribute(name)) return;
        var sourceName = "__aifarSource_" + name;
        if (!element[sourceName]) element[sourceName] = element.getAttribute(name);
        element.setAttribute(name, translateValue(element[sourceName], locale, dictionary));
      });
    });
  }

  function updateMetadata(locale, page) {
    if (!page) return;
    if (page.title && page.title[locale]) document.title = page.title[locale];
    var description = document.querySelector('meta[name="description"]');
    if (description && page.description && page.description[locale]) {
      description.setAttribute("content", page.description[locale]);
    }
  }

  function buildLanguageSwitcher(locale) {
    if (document.querySelector("[data-language-switcher]")) return;
    var navWrap = document.querySelector(".nav-wrap");
    if (!navWrap) return;

    var switcher = document.createElement("div");
    switcher.className = "language-switcher";
    switcher.setAttribute("data-language-switcher", "");
    switcher.setAttribute("aria-label", common.Language[locale]);

    Object.keys(languages).forEach(function (code) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "language-option";
      button.setAttribute("data-locale", code);
      button.setAttribute("aria-label", languages[code].label);
      button.textContent = languages[code].shortLabel;
      if (code === locale) button.setAttribute("aria-pressed", "true");
      button.addEventListener("click", function () {
        setLocale(code);
      });
      switcher.appendChild(button);
    });

    navWrap.appendChild(switcher);
  }

  function setLocale(locale) {
    var path = currentPath();
    var page = pageCopy[path] || pageCopy["/"];
    var dictionary = mergedStrings(path);
    var lang = languages[locale] || languages[defaultLocale];

    localStorage.setItem(storageKey, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = lang.dir;
    document.body.setAttribute("data-locale", locale);
    updateMetadata(locale, page);
    translateTextNodes(document.body, locale, dictionary);
    translateAttributes(document.body, locale, dictionary);

    document.querySelectorAll("[data-locale]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-locale") === locale));
    });
    var switcher = document.querySelector("[data-language-switcher]");
    if (switcher) switcher.setAttribute("aria-label", common.Language[locale]);
    var toggle = document.querySelector("[data-menu-toggle]");
    if (toggle) toggle.setAttribute("aria-label", common["Open navigation"][locale]);
  }

  var locale = localeFromStorage();
  buildLanguageSwitcher(locale);

  var toggle = document.querySelector("[data-menu-toggle]");
  var nav = document.querySelector("[data-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var isOpen = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", String(!isOpen));
      toggle.setAttribute("aria-expanded", String(!isOpen));
    });
  }

  var activePath = currentPath();
  document.querySelectorAll("[data-nav] a").forEach(function (link) {
    var linkPath = new URL(link.href).pathname;
    if (linkPath === activePath) {
      link.setAttribute("aria-current", "page");
    }
  });

  setLocale(locale);
})();
