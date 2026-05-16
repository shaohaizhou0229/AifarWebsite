const fs = require("fs");

const locales = ["en", "zh-CN", "fr", "ar"];
const base = JSON.parse(fs.readFileSync("messages/en.json", "utf8"));

base.layout.footer.full = "© 2026 Aifar. All rights reserved.";
base.layout.footer.short = "© 2026 Aifar.";
base.forms.auth.errors = {
  google_failed: "Google sign in failed. Please try again.",
  google_missing_code: "Google sign in callback is missing a code."
};
base.forms.admin.ticketStatuses = {
  new: "New",
  in_progress: "In progress",
  closed: "Closed"
};
base.forms.downloads = {
  ...base.forms.downloads,
  uploadStatus: "Upload status",
  uploadStatuses: {
    idle: "Ready",
    uploading: "Uploading",
    uploaded: "Uploaded",
    failed: "Failed",
    complete: "Complete"
  },
  resumeUpload: "Resume upload",
  pauseUpload: "Pause",
  uploadSizeProgress: "· {uploaded}{total} MB"
};
base.pages.account.cards.ticketsText = "{count} contact requests linked to your account.";
base.pages.adminDownloadDetail.originalFile = "Original file";

const localeText = {
  "zh-CN": {
    generic: "本地化内容",
    layout: {
      menu: "打开导航",
      language: "语言",
      nav: {
        product: "产品",
        downloads: "下载",
        whatsNew: "最新动态",
        docs: "文档",
        support: "支持",
        contact: "联系",
        admin: "管理后台",
        account: "账户",
        signIn: "登录"
      },
      footer: {
        full: "© 2026 Aifar。保留所有权利。",
        short: "© 2026 Aifar。",
        security: "安全",
        docs: "文档",
        contact: "联系"
      },
      auth: {
        signOut: "退出登录",
        signingOut: "正在退出..."
      }
    },
    forms: {
      common: {
        email: "邮箱",
        name: "姓名",
        organization: "组织",
        workEmail: "工作邮箱",
        password: "密码",
        pleaseWait: "请稍候..."
      },
      auth: {
        createAccount: "创建账户",
        signIn: "登录",
        register: "注册",
        alreadyHaveAccount: "已有账户？",
        needAccount: "需要账户？",
        confirmation: "请先查收邮件并确认账户，然后再登录。",
        failure: "认证失败。",
        continueWithGoogle: "使用 Google 继续",
        orEmail: "或使用邮箱",
        errors: {
          google_failed: "Google 登录失败，请重试。",
          google_missing_code: "Google 登录回调缺少授权码。"
        }
      },
      contact: {
        subject: "主题",
        requestType: "请求类型",
        message: "留言",
        submit: "提交请求",
        submitting: "正在提交...",
        validation: "请填写姓名、工作邮箱、请求类型和留言。",
        invalidEmail: "请输入有效的工作邮箱。",
        submitFailed: "提交失败",
        success: "你的请求已提交，Aifar 团队会尽快跟进。",
        error: "当前无法提交请求，请稍后重试。",
        requestTypes: {
          product_inquiry: "产品咨询",
          technical_support: "技术支持",
          partnership: "合作",
          other: "其他"
        }
      },
      profile: {
        jobTitle: "职位",
        countryRegion: "国家 / 地区",
        phone: "电话",
        save: "保存资料",
        saving: "正在保存...",
        success: "资料已更新。",
        failure: "资料更新失败。"
      },
      admin: {
        statusActions: "工单状态操作",
        markInProgress: "标记处理中",
        closeTicket: "关闭工单",
        reply: "回复",
        sendReply: "发送回复",
        sending: "正在发送...",
        statusUpdated: "工单状态已更新。",
        statusFailure: "无法更新状态。",
        replyRequired: "请填写回复内容。",
        replyFailure: "无法发送回复。",
        ticketStatuses: {
          new: "新建",
          in_progress: "处理中",
          closed: "已关闭"
        }
      },
      downloads: {
        version: "版本",
        buildNumber: "构建号",
        externalUrl: "外部链接",
        releaseNotes: "发布说明",
        published: "已发布",
        save: "保存版本",
        saving: "正在保存...",
        saved: "版本已保存。",
        saveFailed: "无法保存版本。",
        file: "发布文件",
        fileHint: "支持 exe、msi、dmg、pkg、apk、zip。上传新文件后，该平台会保持未发布状态，直到你再次发布。",
        fileRequired: "请选择文件。",
        upload: "上传文件",
        uploading: "正在上传...",
        uploaded: "文件已上传。请检查版本信息并在准备好后发布。",
        uploadFailed: "无法上传文件。",
        uploadTooLarge: "文件超过当前 Supabase Storage 上传限制。请在 Supabase Storage Settings 中将 Global file size limit 设置为至少 300 MB，或上传更小的文件。",
        uploadProgressTitle: "上传进度",
        uploadStatusIdle: "准备上传",
        uploadStatusPreparing: "正在准备文件和校验值...",
        uploadStatusUploading: "正在上传文件...",
        uploadStatusPaused: "上传已暂停",
        uploadStatusFinalizing: "正在完成发布文件...",
        uploadStatusComplete: "上传完成",
        uploadStatusInterrupted: "上一次上传未完成",
        uploadStatusFailed: "上传失败",
        uploadInterruptedHint: "请选择同一个文件并重新开始上传以继续。",
        cancelUpload: "取消上传",
        cancellingUpload: "正在取消...",
        uploadCancelled: "上传已取消。",
        currentFile: "当前文件",
        deleteFile: "删除文件",
        deletingFile: "正在删除...",
        fileDeleted: "发布文件已删除。",
        deleteFileFailed: "无法删除发布文件。",
        deleteFileConfirm: "确认删除当前发布文件？该平台会被取消发布。",
        currentWebFile: "当前网站文件",
        currentWebFileHint: "这是访客在平台发布后会下载的文件。",
        noCurrentFile: "尚未上传文件",
        noCurrentFileHint: "发布该平台前，请先上传安装包文件。",
        replacementFile: "替换文件",
        chooseReplacement: "选择要上传的安装包",
        replacementHint: "选择文件不会立即改变当前网站文件。只有上传完成后才会替换。",
        chooseFile: "选择文件",
        changeFile: "更换文件",
        clearSelectedFile: "清除选择",
        selectedFile: "已选文件",
        uploadReplacement: "上传替换文件",
        uploadStatus: "上传状态",
        uploadStatuses: {
          idle: "准备就绪",
          uploading: "上传中",
          uploaded: "已上传",
          failed: "失败",
          complete: "完成"
        },
        resumeUpload: "继续上传",
        pauseUpload: "暂停",
        uploadSizeProgress: "· {uploaded}{total} MB"
      }
    }
  },
  fr: {
    generic: "Présentation Aifar",
    layout: {
      menu: "Ouvrir la navigation",
      language: "Langue",
      nav: {
        product: "Produit",
        downloads: "Téléchargements",
        whatsNew: "Nouveautés",
        docs: "Docs",
        support: "Support",
        contact: "Contact",
        admin: "Admin",
        account: "Compte",
        signIn: "Connexion"
      },
      footer: {
        full: "© 2026 Aifar. Tous droits réservés.",
        short: "© 2026 Aifar.",
        security: "Sécurité",
        docs: "Documentation",
        contact: "Contact"
      },
      auth: {
        signOut: "Se déconnecter",
        signingOut: "Déconnexion..."
      }
    },
    forms: {
      common: {
        email: "E-mail",
        name: "Nom",
        organization: "Organisation",
        workEmail: "E-mail professionnel",
        password: "Mot de passe",
        pleaseWait: "Veuillez patienter..."
      },
      auth: {
        createAccount: "Créer un compte",
        signIn: "Se connecter",
        register: "S’inscrire",
        alreadyHaveAccount: "Vous avez déjà un compte ? ",
        needAccount: "Besoin d’un compte ? ",
        confirmation: "Veuillez confirmer votre compte par e-mail avant de vous connecter.",
        failure: "Échec de l’authentification.",
        continueWithGoogle: "Continuer avec Google",
        orEmail: "ou utiliser l’e-mail",
        errors: {
          google_failed: "La connexion Google a échoué. Veuillez réessayer.",
          google_missing_code: "Le rappel Google ne contient pas de code d’autorisation."
        }
      },
      contact: {
        subject: "Sujet",
        requestType: "Type de demande",
        message: "Message",
        submit: "Envoyer la demande",
        submitting: "Envoi...",
        validation: "Veuillez renseigner votre nom, e-mail professionnel, type de demande et message.",
        invalidEmail: "Veuillez saisir un e-mail professionnel valide.",
        submitFailed: "Échec de l’envoi",
        success: "Votre demande a été envoyée. L’équipe Aifar vous répondra bientôt.",
        error: "Impossible d’envoyer votre demande pour le moment. Veuillez réessayer plus tard.",
        requestTypes: {
          product_inquiry: "Demande produit",
          technical_support: "Support technique",
          partnership: "Partenariat",
          other: "Autre"
        }
      },
      profile: {
        jobTitle: "Fonction",
        countryRegion: "Pays / Région",
        phone: "Téléphone",
        save: "Enregistrer le profil",
        saving: "Enregistrement...",
        success: "Profil mis à jour.",
        failure: "Échec de la mise à jour du profil."
      },
      admin: {
        statusActions: "Actions de statut du ticket",
        markInProgress: "Marquer en cours",
        closeTicket: "Fermer le ticket",
        reply: "Réponse",
        sendReply: "Envoyer la réponse",
        sending: "Envoi...",
        statusUpdated: "Statut du ticket mis à jour.",
        statusFailure: "Impossible de mettre à jour le statut.",
        replyRequired: "Le message de réponse est obligatoire.",
        replyFailure: "Impossible d’envoyer la réponse.",
        ticketStatuses: {
          new: "Nouveau",
          in_progress: "En cours",
          closed: "Fermé"
        }
      },
      downloads: {
        version: "Version",
        buildNumber: "Numéro de build",
        externalUrl: "URL externe",
        releaseNotes: "Notes de version",
        published: "Publié",
        save: "Enregistrer la version",
        saving: "Enregistrement...",
        saved: "Version enregistrée.",
        saveFailed: "Impossible d’enregistrer la version.",
        file: "Fichier de version",
        fileHint: "Fichiers pris en charge : exe, msi, dmg, pkg, apk, zip. L’envoi d’un nouveau fichier dépublie la plateforme jusqu’à une nouvelle publication.",
        fileRequired: "Veuillez choisir un fichier.",
        upload: "Envoyer le fichier",
        uploading: "Envoi...",
        uploaded: "Fichier envoyé. Vérifiez la version puis publiez.",
        uploadFailed: "Impossible d’envoyer le fichier.",
        uploadTooLarge: "Le fichier dépasse la limite Supabase Storage actuelle. Réglez la limite globale à au moins 300 MB ou envoyez un fichier plus petit.",
        uploadProgressTitle: "Progression de l’envoi",
        uploadStatusIdle: "Prêt à envoyer",
        uploadStatusPreparing: "Préparation du fichier et du checksum...",
        uploadStatusUploading: "Envoi du fichier...",
        uploadStatusPaused: "Envoi en pause",
        uploadStatusFinalizing: "Finalisation du fichier...",
        uploadStatusComplete: "Envoi terminé",
        uploadStatusInterrupted: "L’envoi précédent n’est pas terminé",
        uploadStatusFailed: "Échec de l’envoi",
        uploadInterruptedHint: "Choisissez le même fichier et relancez l’envoi pour continuer.",
        cancelUpload: "Annuler l’envoi",
        cancellingUpload: "Annulation...",
        uploadCancelled: "Envoi annulé.",
        currentFile: "Fichier actuel",
        deleteFile: "Supprimer le fichier",
        deletingFile: "Suppression...",
        fileDeleted: "Fichier de version supprimé.",
        deleteFileFailed: "Impossible de supprimer le fichier.",
        deleteFileConfirm: "Supprimer le fichier actuel ? Cette plateforme sera dépubliée.",
        currentWebFile: "Fichier web actuel",
        currentWebFileHint: "C’est le fichier que les visiteurs téléchargeront après publication.",
        noCurrentFile: "Aucun fichier envoyé",
        noCurrentFileHint: "Envoyez un package avant de publier cette plateforme.",
        replacementFile: "Fichier de remplacement",
        chooseReplacement: "Choisir un package à envoyer",
        replacementHint: "Choisir un fichier ne change pas le fichier web actuel. Il sera remplacé après l’envoi.",
        chooseFile: "Choisir un fichier",
        changeFile: "Changer de fichier",
        clearSelectedFile: "Effacer la sélection",
        selectedFile: "Fichier sélectionné",
        uploadReplacement: "Envoyer le remplacement",
        uploadStatus: "Statut d’envoi",
        uploadStatuses: {
          idle: "Prêt",
          uploading: "Envoi",
          uploaded: "Envoyé",
          failed: "Échec",
          complete: "Terminé"
        },
        resumeUpload: "Reprendre l’envoi",
        pauseUpload: "Pause",
        uploadSizeProgress: "· {uploaded}{total} MB"
      }
    }
  },
  ar: {
    generic: "معلومات Aifar",
    layout: {
      menu: "فتح التنقل",
      language: "اللغة",
      nav: {
        product: "المنتج",
        downloads: "التنزيلات",
        whatsNew: "الجديد",
        docs: "الوثائق",
        support: "الدعم",
        contact: "اتصل بنا",
        admin: "الإدارة",
        account: "الحساب",
        signIn: "تسجيل الدخول"
      },
      footer: {
        full: "© 2026 Aifar. جميع الحقوق محفوظة.",
        short: "© 2026 Aifar.",
        security: "الأمان",
        docs: "الوثائق",
        contact: "التواصل"
      },
      auth: {
        signOut: "تسجيل الخروج",
        signingOut: "جار تسجيل الخروج..."
      }
    },
    forms: {
      common: {
        email: "البريد الإلكتروني",
        name: "الاسم",
        organization: "المؤسسة",
        workEmail: "بريد العمل",
        password: "كلمة المرور",
        pleaseWait: "يرجى الانتظار..."
      },
      auth: {
        createAccount: "إنشاء حساب",
        signIn: "تسجيل الدخول",
        register: "تسجيل",
        alreadyHaveAccount: "لديك حساب بالفعل؟ ",
        needAccount: "تحتاج إلى حساب؟ ",
        confirmation: "يرجى تأكيد حسابك عبر البريد قبل تسجيل الدخول.",
        failure: "فشلت المصادقة.",
        continueWithGoogle: "المتابعة باستخدام Google",
        orEmail: "أو استخدم البريد",
        errors: {
          google_failed: "فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.",
          google_missing_code: "استدعاء Google لا يحتوي على رمز التفويض."
        }
      },
      contact: {
        subject: "الموضوع",
        requestType: "نوع الطلب",
        message: "الرسالة",
        submit: "إرسال الطلب",
        submitting: "جار الإرسال...",
        validation: "يرجى إدخال الاسم وبريد العمل ونوع الطلب والرسالة.",
        invalidEmail: "يرجى إدخال بريد عمل صالح.",
        submitFailed: "فشل الإرسال",
        success: "تم إرسال طلبك. سيتابع فريق Aifar قريباً.",
        error: "تعذر إرسال الطلب الآن. يرجى المحاولة لاحقاً.",
        requestTypes: {
          product_inquiry: "استفسار عن المنتج",
          technical_support: "دعم فني",
          partnership: "شراكة",
          other: "أخرى"
        }
      },
      profile: {
        jobTitle: "المسمى الوظيفي",
        countryRegion: "الدولة / المنطقة",
        phone: "الهاتف",
        save: "حفظ الملف",
        saving: "جار الحفظ...",
        success: "تم تحديث الملف.",
        failure: "فشل تحديث الملف."
      },
      admin: {
        statusActions: "إجراءات حالة التذكرة",
        markInProgress: "تعيين قيد المعالجة",
        closeTicket: "إغلاق التذكرة",
        reply: "رد",
        sendReply: "إرسال الرد",
        sending: "جار الإرسال...",
        statusUpdated: "تم تحديث حالة التذكرة.",
        statusFailure: "تعذر تحديث الحالة.",
        replyRequired: "رسالة الرد مطلوبة.",
        replyFailure: "تعذر إرسال الرد.",
        ticketStatuses: {
          new: "جديدة",
          in_progress: "قيد المعالجة",
          closed: "مغلقة"
        }
      },
      downloads: {
        version: "الإصدار",
        buildNumber: "رقم البناء",
        externalUrl: "رابط خارجي",
        releaseNotes: "ملاحظات الإصدار",
        published: "منشور",
        save: "حفظ الإصدار",
        saving: "جار الحفظ...",
        saved: "تم حفظ الإصدار.",
        saveFailed: "تعذر حفظ الإصدار.",
        file: "ملف الإصدار",
        fileHint: "الملفات المدعومة: exe و msi و dmg و pkg و apk و zip. رفع ملف جديد يلغي نشر المنصة حتى تعيد نشرها.",
        fileRequired: "يرجى اختيار ملف.",
        upload: "رفع الملف",
        uploading: "جار الرفع...",
        uploaded: "تم رفع الملف. راجع الإصدار ثم انشره.",
        uploadFailed: "تعذر رفع الملف.",
        uploadTooLarge: "يتجاوز الملف حد Supabase Storage الحالي. اضبط الحد العام إلى 300 MB على الأقل أو ارفع ملفاً أصغر.",
        uploadProgressTitle: "تقدم الرفع",
        uploadStatusIdle: "جاهز للرفع",
        uploadStatusPreparing: "جار تجهيز الملف والتحقق...",
        uploadStatusUploading: "جار رفع الملف...",
        uploadStatusPaused: "تم إيقاف الرفع مؤقتاً",
        uploadStatusFinalizing: "جار إنهاء ملف الإصدار...",
        uploadStatusComplete: "اكتمل الرفع",
        uploadStatusInterrupted: "الرفع السابق لم يكتمل",
        uploadStatusFailed: "فشل الرفع",
        uploadInterruptedHint: "اختر الملف نفسه وابدأ الرفع مرة أخرى للمتابعة.",
        cancelUpload: "إلغاء الرفع",
        cancellingUpload: "جار الإلغاء...",
        uploadCancelled: "تم إلغاء الرفع.",
        currentFile: "الملف الحالي",
        deleteFile: "حذف الملف",
        deletingFile: "جار الحذف...",
        fileDeleted: "تم حذف ملف الإصدار.",
        deleteFileFailed: "تعذر حذف ملف الإصدار.",
        deleteFileConfirm: "هل تريد حذف ملف الإصدار الحالي؟ سيتم إلغاء نشر هذه المنصة.",
        currentWebFile: "ملف الموقع الحالي",
        currentWebFileHint: "هذا هو الملف الذي سيحمله الزوار بعد نشر المنصة.",
        noCurrentFile: "لم يتم رفع ملف",
        noCurrentFileHint: "ارفع حزمة قبل نشر هذه المنصة.",
        replacementFile: "ملف بديل",
        chooseReplacement: "اختر حزمة للرفع",
        replacementHint: "اختيار ملف لا يغير ملف الموقع الحالي. يتم الاستبدال بعد اكتمال الرفع.",
        chooseFile: "اختيار ملف",
        changeFile: "تغيير الملف",
        clearSelectedFile: "مسح الاختيار",
        selectedFile: "الملف المختار",
        uploadReplacement: "رفع البديل",
        uploadStatus: "حالة الرفع",
        uploadStatuses: {
          idle: "جاهز",
          uploading: "يرفع",
          uploaded: "مرفوع",
          failed: "فشل",
          complete: "مكتمل"
        },
        resumeUpload: "متابعة الرفع",
        pauseUpload: "إيقاف مؤقت",
        uploadSizeProgress: "· {uploaded}{total} MB"
      }
    }
  }
};

const sharedPages = {
  "zh-CN": {
    home: {
      seo: {
        title: "Aifar | 面向政府和企业团队的轻量级标准协同平台",
        description: "Aifar 将聊天、会议、邮件、联系人、文档、流程和表单整合到一个轻量协同工作空间。"
      },
      eyebrow: "政府与企业协同",
      title: "Aifar",
      lead: "面向需要清晰沟通、结构化工作和多端可靠访问的团队，提供轻量级标准协同能力。",
      primaryCta: "下载 Aifar",
      secondaryCta: "联系销售",
      heroAlt: "Aifar 协同工作台预览",
      schemaDescription: "面向政府和企业团队的轻量级标准协同软件。",
      trustLabel: "Aifar 平台亮点",
      trust: [["7", "核心协同模块"], ["5", "支持的客户端类型"], ["24/7", "面向支持流程的网站结构"], ["SEO", "轻量可上线"]],
      modulesTitle: "一个标准协同工作空间",
      modulesLead: "Aifar 覆盖团队日常协同层，避免工具过重、过散和难维护。",
      modules: [["C", "Chat", "团队消息。"], ["M", "Meeting", "会议访问。"], ["E", "Email", "邮件流程。"], ["D", "Documents", "文档访问。"]],
      managedTitle: "为可管理团队而设计",
      managedLead: "官网将作为产品介绍、下载、更新、文档和技术支持的统一入口。",
      features: [["多端访问", "覆盖 PC、iOS、Android Phone、Android Pad 和 Mac Preview。"], ["运营内容分区", "最新动态、文档、支持和下载页面分开维护。"], ["未来接入 Aifar 能力", "后续可接入 Aifar Forms、Workflow、Docs、Chat、Meeting、Email 和 Contact。"]],
      updatesTitle: "最新更新",
      viewAll: "查看全部",
      updates: [["网站基础结构", "已准备产品介绍、下载、文档、支持和联系入口。", "规划"], ["Mac 客户端预览", "下载区域包含 Mac 预览版通道。", "预览"], ["文档中心准备", "已预留用户指南、管理员指南、部署说明和支持政策入口。", "文档"]],
      ctaEyebrow: "面向上线运营",
      ctaTitle: "先建立清晰官网，再逐步成长为连接 Aifar 的服务门户。",
      ctaLead: "首版保持轻量、可部署。后续可把表单、流程、文档、联系人记录和支持沟通直接接入 Aifar。",
      ctaPrimary: "获取 Aifar",
      ctaSecondary: "技术支持"
    },
    product: {
      seo: { title: "产品 | Aifar", description: "了解 Aifar 的聊天、会议、邮件、联系人、文档、流程和表单能力。" },
      eyebrow: "产品",
      title: "标准协同，不增加不必要的复杂度。",
      lead: "Aifar 将沟通、结构化工作和业务记录整合到一个轻量工作空间。",
      features: [["C", "Chat", "团队频道和工作上下文。"], ["M", "Meeting", "会议访问。"], ["E", "Email", "正式沟通。"], ["P", "Contact", "联系人和组织信息。"], ["D", "Documents", "文档和共享资源。"], ["W", "Workflow", "审批和运营流程。"], ["F", "Forms", "数据收集。"]]
    },
    downloads: {
      seo: { title: "下载 | Aifar", description: "下载 Aifar PC、iOS、Android Phone、Android Pad 和 Mac Preview 客户端。" },
      eyebrow: "下载",
      title: "在团队已经使用的设备上获取 Aifar。",
      lead: "下载链接可以接入发布存储或 Aifar 管理的版本记录。",
      versionLabel: "版本",
      comingSoon: "即将提供",
      items: [["PC 客户端", "Windows 桌面客户端。", "下载", "primary"], ["iOS 客户端", "iPhone 和 iPad 移动访问。", "App Store", "secondary"], ["Android Phone", "手机端 Android 客户端。", "下载 APK", "secondary"], ["Android Pad", "平板 Android 体验。", "下载 APK", "secondary"], ["Mac 客户端", "当前通道：预览版。", "预览", "secondary"]]
    },
    docs: { seo: { title: "文档 | Aifar", description: "Aifar 文档中心。" }, eyebrow: "文档", title: "面向用户、管理员和支持团队的指南。", lead: "文档中心已为产品资料准备好入口。", items: [["快速开始", "核心概念和首次使用清单。", "用户指南"], ["客户端安装", "安装和更新客户端。", "安装"], ["管理员指南", "团队结构和访问管理。", "管理"], ["安全概览", "安全和企业部署说明。", "安全"]] },
    support: { seo: { title: "支持 | Aifar", description: "获取 Aifar 技术支持。" }, eyebrow: "支持", title: "面向 Aifar 团队的技术支持。", lead: "此页面为账号、客户端、部署和产品支持流程预留入口。", items: [["A", "账号访问", "登录和组织访问支持。"], ["I", "安装", "客户端设置指南。"], ["T", "技术问题", "结构化支持请求。"]] },
    contact: { seo: { title: "联系 | Aifar", description: "联系 Aifar 团队。" }, eyebrow: "联系", title: "与 Aifar 团队沟通。", lead: "提交产品咨询、技术支持或合作请求。" },
    security: { seo: { title: "安全 | Aifar", description: "Aifar 安全和合规概览。" }, eyebrow: "安全", title: "为可管理协同环境而设计。", lead: "承载 Aifar 的安全、隐私、治理和部署信息。", items: [["G", "治理", "清晰权责和结构化沟通。"], ["P", "隐私", "隐私和数据处理说明。"], ["D", "部署", "部署和更新策略。"]] },
    whatsNew: { seo: { title: "最新动态 | Aifar", description: "阅读 Aifar 发布说明和产品更新。" }, eyebrow: "最新动态", title: "产品更新与发布说明。", lead: "在此发布版本亮点、客户端更新、修复和运营公告。", items: [["网站基础结构", "首版公开网站结构。", "网站"], ["Mac Preview 通道", "Mac 预览版入口。", "客户端"], ["文档中心", "文档入口已准备。", "文档"]] }
  }
};

const adminPageText = {
  "zh-CN": {
    login: { seo: { title: "登录 | Aifar", description: "登录 Aifar 账户。" }, eyebrow: "账户", title: "登录 Aifar。", lead: "访问个人资料并查看联系请求。" },
    register: { seo: { title: "注册 | Aifar", description: "创建 Aifar 账户。" }, eyebrow: "账户", title: "创建你的 Aifar 账户。", lead: "使用工作邮箱关联联系请求。" },
    account: { seo: { title: "账户 | Aifar", description: "管理你的 Aifar 资料和工单。" }, eyebrow: "账户", welcome: "欢迎", lead: "管理个人资料并查看联系请求。", cards: { profileTitle: "个人资料", profileText: "保持组织和联系方式最新。", profileAction: "编辑资料", ticketsTitle: "工单", ticketsText: "你的账户关联了 {count} 条联系请求。", ticketsAction: "查看工单", contactTitle: "联系 Aifar", contactText: "提交新请求。", contactAction: "新建请求" } },
    profile: { seo: { title: "个人资料 | Aifar", description: "更新你的 Aifar 账户资料。" }, eyebrow: "个人资料", title: "管理你的个人资料。", lead: "这些信息帮助 Aifar 团队理解你的组织背景。" },
    tickets: { seo: { title: "我的工单 | Aifar", description: "查看联系请求。" }, eyebrow: "工单", title: "你的联系请求。", lead: "请求会通过账户和工作邮箱关联。", emptyTitle: "暂无工单", emptyText: "提交联系请求后会显示在这里。", emptyAction: "联系 Aifar" },
    ticketDetail: { seo: { title: "工单详情 | Aifar", description: "查看联系请求和回复。" }, eyebrow: "工单", status: "状态", submitted: "提交于", requestTitle: "你的请求", replies: "回复", aifarTeam: "Aifar 团队", user: "用户", noReplies: "暂无回复。" },
    adminHome: { seo: { title: "管理后台 | Aifar", description: "管理 Aifar 网站运营。" }, eyebrow: "管理后台", deniedTitle: "需要管理员权限。", deniedLead: "你的账户无权管理 Aifar 网站运营。", title: "Aifar 管理中心。", lead: "选择要操作的区域。", active: "可用", planned: "规划中", nav: { label: "管理区域", home: "管理中心", product: "产品", downloads: "下载", docs: "文档", support: "支持", contact: "联系我们" }, modules: [{ key: "product", href: "/admin/product/", title: "产品内容", description: "维护产品页面和公开内容。", status: "planned" }, { key: "downloads", href: "/admin/downloads/", title: "客户端下载", description: "维护客户端版本和发布文件。", status: "active" }, { key: "docs", href: "/admin/docs/", title: "在线文档", description: "准备在线文档工作区。", status: "planned" }, { key: "support", href: "/admin/support/", title: "支持反馈", description: "管理支持反馈。", status: "planned" }, { key: "contact", href: "/admin/contact/", title: "联系表单", description: "查看并回复联系请求。", status: "active" }] },
    adminProduct: { seo: { title: "管理产品 | Aifar", description: "管理 Aifar 产品内容。" }, eyebrow: "管理产品", deniedTitle: "需要管理员权限。", deniedLead: "你的账户无权管理产品内容。", breadcrumb: "产品", title: "产品内容管理。", lead: "此区域为产品内容发布预留。", status: "规划中", emptyTitle: "产品内容工具尚未接入。", emptyLead: "导航和权限边界已准备好。" },
    adminDocs: { seo: { title: "管理文档 | Aifar", description: "管理 Aifar 在线文档。" }, eyebrow: "管理文档", deniedTitle: "需要管理员权限。", deniedLead: "你的账户无权管理在线文档。", breadcrumb: "文档", title: "在线文档管理。", lead: "此区域为在线文档工作区预留。", status: "规划中", emptyTitle: "在线文档编辑尚未接入。", emptyLead: "管理入口已准备好。" },
    adminSupport: { seo: { title: "管理支持 | Aifar", description: "管理 Aifar 支持反馈。" }, eyebrow: "管理支持", deniedTitle: "需要管理员权限。", deniedLead: "你的账户无权管理支持反馈。", breadcrumb: "支持", title: "支持反馈管理。", lead: "此区域为支持处理流程预留。", status: "规划中", emptyTitle: "支持反馈工具尚未接入。", emptyLead: "管理入口已准备好。" },
    adminContact: { seo: { title: "管理联系表单 | Aifar", description: "查询和管理联系请求。" }, eyebrow: "管理联系", deniedTitle: "需要管理员权限。", deniedLead: "你的账户无权查询联系请求。", breadcrumb: "联系我们", title: "联系表单查询。", lead: "查看网站联系请求并关闭已处理请求。", all: "全部", new: "新建", inProgress: "处理中", closed: "已关闭", emptyTitle: "未找到联系请求。", emptyLead: "新的网站联系提交会显示在这里。" },
    adminTickets: { seo: { title: "管理工单 | Aifar", description: "管理联系请求工单。" }, eyebrow: "管理后台", deniedTitle: "需要管理员权限。", deniedLead: "你的账户无权管理工单。", breadcrumb: "工单列表", title: "联系请求工单。", lead: "查看、回复并关闭网站联系请求。", all: "全部", new: "新建", inProgress: "处理中", closed: "已关闭" },
    adminTicketDetail: { seo: { title: "管理工单详情 | Aifar", description: "查看、回复并更新工单。" }, eyebrow: "管理工单", deniedTitle: "需要管理员权限。", deniedLead: "你的账户无权管理此工单。", breadcrumb: "工单详情", submitted: "提交于", requestTitle: "请求", organization: "组织", notProvided: "未提供", replies: "回复", noReplies: "暂无回复。" },
    adminDownloads: { seo: { title: "管理下载 | Aifar", description: "管理客户端下载版本。" }, eyebrow: "管理后台", deniedTitle: "需要管理员权限。", deniedLead: "你的账户无权管理客户端下载。", breadcrumb: "下载", title: "客户端下载。", lead: "维护每个平台当前公开发布版本。", tickets: "工单管理", published: "已发布", draft: "草稿", noVersion: "未配置版本" },
    adminDownloadDetail: { seo: { title: "管理下载详情 | Aifar", description: "更新客户端版本并上传文件。" }, eyebrow: "管理下载", deniedTitle: "需要管理员权限。", deniedLead: "你的账户无权管理此下载。", lead: "上传发布文件，填写版本信息，并在准备好后发布。", current: "当前版本", status: "状态", published: "已发布", draft: "草稿", file: "文件", originalFile: "原始文件", fileSize: "文件大小", publishedAt: "发布时间", noVersion: "未配置版本", noFile: "未配置文件或外部链接" }
  }
};

function mapLocale(value, locale, path = []) {
  if (Array.isArray(value)) return value.map((item, index) => mapLocale(item, locale, path.concat(index)));
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) out[key] = mapLocale(child, locale, path.concat(key));
    return out;
  }
  if (typeof value !== "string") return value;
  if (/^([A-Z]|[0-9]|SEO|App Store|APK|Aifar|Chat|Meeting|Email|Contact|Documents|Workflow|Forms|PC|iOS|Android|Mac|SHA-256|MB)$/.test(value)) return value;
  if (value.includes("{count}")) {
    if (locale === "fr") return "{count} demandes de contact liées à votre compte.";
    if (locale === "ar") return "{count} طلبات تواصل مرتبطة بحسابك.";
  }
  const generic = localeText[locale].generic;
  if (path.includes("seo") && path.at(-1) === "title") return `${generic} | Aifar`;
  if (path.includes("seo") && path.at(-1) === "description") {
    return locale === "ar" ? "معلومات Aifar للفرق والمؤسسات." : "Informations Aifar pour les équipes et les organisations.";
  }
  if (path.at(-1) === "lead") {
    return locale === "ar" ? "معلومات منظمة حول قدرات Aifar وخدماته." : "Informations structurées sur les capacités et services Aifar.";
  }
  if (path.at(-1) === "title") return generic;
  return generic;
}

function merge(baseValue, overrideValue) {
  if (Array.isArray(baseValue) || Array.isArray(overrideValue)) return overrideValue ?? baseValue;
  if (!baseValue || typeof baseValue !== "object" || !overrideValue || typeof overrideValue !== "object") return overrideValue ?? baseValue;
  const out = { ...baseValue };
  for (const [key, child] of Object.entries(overrideValue)) out[key] = merge(baseValue[key], child);
  return out;
}

const outputs = { en: base };
for (const locale of locales.slice(1)) {
  outputs[locale] = merge(mapLocale(base, locale), localeText[locale]);
  delete outputs[locale].generic;
  outputs[locale].pages = merge(outputs[locale].pages, sharedPages[locale] || {});
  outputs[locale].pages = merge(outputs[locale].pages, adminPageText[locale] || {});
}

for (const [locale, messages] of Object.entries(outputs)) {
  fs.writeFileSync(`messages/${locale}.json`, `${JSON.stringify(messages, null, 2)}\n`, "utf8");
}
