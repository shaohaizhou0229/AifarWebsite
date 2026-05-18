function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paragraph(lines) {
  return lines.filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function button(label, href) {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#111820;color:#ffffff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700;">${escapeHtml(label)}</a></p>`;
}

function layout(title, body) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#111820;">`
    + `<div style="max-width:640px;margin:0 auto;padding:24px;">`
    + `<h1 style="font-size:24px;margin:0 0 16px;">${escapeHtml(title)}</h1>`
    + body
    + `<p style="color:#64748b;font-size:13px;margin-top:28px;">Aifar</p>`
    + `</div></body></html>`;
}

function textBlock(lines) {
  return lines.filter(Boolean).join("\n\n");
}

export function buildInvitationEmail({ invitation, registerUrl }) {
  const name = invitation.displayName || invitation.email;
  const title = "Aifar 账号邀请 / Account invitation";
  const lines = [
    `您好 ${name}，`,
    "Aifar 管理员已为您创建账号邀请。",
    "请使用这封邮件对应的邮箱注册。注册完成后，系统会自动承接您的资料、角色和权限。",
    `Hello ${name},`,
    "An Aifar administrator has prepared an account invitation for you.",
    "Please register with this email address. After registration, your profile, role, and permissions will be applied automatically.",
    registerUrl
  ];

  return {
    subject: "Aifar 账号邀请 / You are invited to Aifar",
    text: textBlock(lines),
    html: layout(title, paragraph(lines.slice(0, -1)) + button("注册账号 / Register account", registerUrl))
  };
}

export function buildContactRequestEmail({ ticket, adminUrl }) {
  const title = "新的 Aifar 联系请求 / New contact request";
  const lines = [
    `姓名 / Name: ${ticket.name}`,
    `邮箱 / Email: ${ticket.workEmail}`,
    ticket.organization ? `组织 / Organization: ${ticket.organization}` : "",
    ticket.subject ? `主题 / Subject: ${ticket.subject}` : "",
    `请求类型 / Request type: ${ticket.requestType}`,
    `留言 / Message: ${ticket.message}`,
    adminUrl
  ];

  return {
    subject: `新的联系请求 / New contact request: ${ticket.subject || ticket.requestType}`,
    text: textBlock(lines),
    html: layout(title, paragraph(lines.slice(0, -1)) + button("打开后台 / Open admin", adminUrl))
  };
}

export function buildTicketReplyEmail({ ticket, replyMessage, ticketUrl }) {
  const title = "Aifar 支持团队已回复 / Support replied";
  const lines = [
    `您好 ${ticket.name || ticket.workEmail}，`,
    "Aifar 支持团队已回复您的请求。",
    `主题 / Subject: ${ticket.subject || ticket.requestType}`,
    `回复 / Reply: ${replyMessage}`,
    `Hello ${ticket.name || ticket.workEmail},`,
    "The Aifar team has replied to your support request.",
    ticketUrl
  ];

  return {
    subject: `Aifar 支持回复 / Support reply: ${ticket.subject || ticket.requestType}`,
    text: textBlock(lines),
    html: layout(title, paragraph(lines.slice(0, -1)) + button("查看工单 / View ticket", ticketUrl))
  };
}

export function buildTicketStatusEmail({ ticket, status, ticketUrl }) {
  const title = "Aifar 工单状态更新 / Ticket status updated";
  const lines = [
    `您好 ${ticket.name || ticket.workEmail}，`,
    `您的支持请求状态已更新为：${status}。`,
    `主题 / Subject: ${ticket.subject || ticket.requestType}`,
    `Hello ${ticket.name || ticket.workEmail},`,
    `Your support request status changed to: ${status}.`,
    ticketUrl
  ];

  return {
    subject: `Aifar 工单状态 / Ticket status: ${status}`,
    text: textBlock(lines),
    html: layout(title, paragraph(lines.slice(0, -1)) + button("查看工单 / View ticket", ticketUrl))
  };
}

export function buildDownloadPublishedEmail({ platform, release, adminUrl }) {
  const title = "Aifar 客户端版本已发布 / Client release published";
  const lines = [
    `平台 / Platform: ${platform}`,
    `版本 / Version: ${release.version || "未提供 / Not provided"}`,
    release.buildNumber ? `构建号 / Build: ${release.buildNumber}` : "",
    "官网已发布一个新的客户端版本。",
    "A client release has been published on the website.",
    adminUrl
  ];

  return {
    subject: `Aifar 客户端已发布 / Client published: ${platform}`,
    text: textBlock(lines),
    html: layout(title, paragraph(lines.slice(0, -1)) + button("打开下载后台 / Open downloads admin", adminUrl))
  };
}
