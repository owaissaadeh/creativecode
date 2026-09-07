import { Resend } from "resend";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not set. Add it as a secret to enable transactional emails.");
  }
  return new Resend(apiKey);
}

function getFromEmail(): string {
  const from = process.env.FROM_EMAIL;
  if (!from) {
    throw new Error("FROM_EMAIL not set. Add it as a secret (must be on a domain verified in Resend).");
  }
  return from;
}

// Fire-and-forget: every exported send* function here is called as
// `sendXEmail(...).catch(err => console.error(...))` from route handlers, never awaited
// before res.json(...). A missing RESEND_API_KEY or a Resend outage must never turn a
// successful portal action (approval, comment, ticket) into a failed API response.
async function sendEmail(to: string | string[], subject: string, html: string) {
  const resend = getResendClient();
  const from = getFromEmail();
  await resend.emails.send({ from, to, subject, html });
}

function baseTemplate(bodyHtml: string): string {
  return `<!DOCTYPE html>
  <html dir="rtl" lang="ar">
  <body style="font-family:'Cairo',Tahoma,sans-serif;background:#f5f5f7;margin:0;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
      <div style="background:#0f172a;padding:20px 24px;">
        <span style="color:#fff;font-weight:700;font-size:18px;">Creative Code</span>
      </div>
      <div style="padding:24px;color:#1e293b;line-height:1.8;">${bodyHtml}</div>
      <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px;">
        هذه رسالة آلية من نظام Creative Code — لا حاجة للرد على هذا البريد.
      </div>
    </div>
  </body></html>`;
}

function button(url: string, label: string): string {
  return `<p><a href="${url}" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">${label}</a></p>`;
}

export async function sendPortalWelcomeEmail(opts: { to: string; name: string; tempPassword: string; loginUrl: string }) {
  const html = baseTemplate(`
    <h2>مرحباً ${opts.name} 👋</h2>
    <p>تم إنشاء حساب لك على بوابة عملاء Creative Code لمتابعة مشاريعك أولاً بأول.</p>
    <p><b>البريد الإلكتروني:</b> ${opts.to}<br/><b>كلمة المرور المؤقتة:</b> ${opts.tempPassword}</p>
    ${button(opts.loginUrl, "تسجيل الدخول إلى البوابة")}
  `);
  return sendEmail(opts.to, "تم إنشاء حسابك في بوابة العملاء", html);
}

export async function sendStageApprovedEmail(opts: {
  to: string[]; clientName: string; projectName: string; stageTitle: string; comment?: string;
}) {
  const html = baseTemplate(`
    <h2>✅ تم اعتماد مرحلة</h2>
    <p>العميل <b>${opts.clientName}</b> اعتمد المرحلة التالية من مشروع <b>${opts.projectName}</b>:</p>
    <p style="background:#f0fdf4;border-radius:8px;padding:12px 16px;"><b>${opts.stageTitle}</b></p>
    ${opts.comment ? `<p><b>ملاحظة العميل:</b> ${opts.comment}</p>` : ""}
  `);
  return sendEmail(opts.to, `اعتماد مرحلة "${opts.stageTitle}" — ${opts.projectName}`, html);
}

export async function sendStageChangesRequestedEmail(opts: {
  to: string[]; clientName: string; projectName: string; stageTitle: string; comment?: string;
}) {
  const html = baseTemplate(`
    <h2>✏️ طلب تعديلات على مرحلة</h2>
    <p>العميل <b>${opts.clientName}</b> طلب تعديلات على المرحلة التالية من مشروع <b>${opts.projectName}</b>:</p>
    <p style="background:#fffbeb;border-radius:8px;padding:12px 16px;"><b>${opts.stageTitle}</b></p>
    ${opts.comment ? `<p><b>ملاحظة العميل:</b> ${opts.comment}</p>` : ""}
  `);
  return sendEmail(opts.to, `طلب تعديلات على "${opts.stageTitle}" — ${opts.projectName}`, html);
}

export async function sendStageNeedsActionEmail(opts: {
  to: string[]; projectName: string; stageTitle: string; portalUrl: string;
}) {
  const html = baseTemplate(`
    <h2>📋 مرحلة بانتظار مراجعتك</h2>
    <p>مرحلة <b>${opts.stageTitle}</b> من مشروع <b>${opts.projectName}</b> جاهزة لمراجعتك واعتمادها.</p>
    ${button(opts.portalUrl, "مراجعة المرحلة")}
  `);
  return sendEmail(opts.to, `بانتظار مراجعتك — ${opts.stageTitle}`, html);
}

export async function sendNewDeliverableEmail(opts: {
  to: string[]; projectName: string; deliverableTitle: string; portalUrl: string;
}) {
  const html = baseTemplate(`
    <h2>📁 تسليم جديد</h2>
    <p>تم رفع ملف جديد لمشروع <b>${opts.projectName}</b>: <b>${opts.deliverableTitle}</b></p>
    ${button(opts.portalUrl, "عرض التسليم")}
  `);
  return sendEmail(opts.to, `تسليم جديد — ${opts.projectName}`, html);
}

export async function sendNewClientCommentEmail(opts: {
  to: string[]; clientName: string; projectName: string; commentBody: string;
}) {
  const html = baseTemplate(`
    <h2>💬 تعليق جديد من العميل</h2>
    <p><b>${opts.clientName}</b> أضاف تعليقاً على مشروع <b>${opts.projectName}</b>:</p>
    <p style="background:#f8fafc;border-radius:8px;padding:12px 16px;">${opts.commentBody}</p>
  `);
  return sendEmail(opts.to, `تعليق جديد — ${opts.projectName}`, html);
}

export async function sendNewTicketEmail(opts: {
  to: string[]; clientName: string; subject: string; priority: string; ticketUrl: string;
}) {
  const html = baseTemplate(`
    <h2>🎫 تذكرة دعم جديدة</h2>
    <p>فتح العميل <b>${opts.clientName}</b> تذكرة دعم جديدة:</p>
    <p style="background:#f8fafc;border-radius:8px;padding:12px 16px;"><b>${opts.subject}</b><br/>الأولوية: ${opts.priority}</p>
  `);
  return sendEmail(opts.to, `تذكرة دعم جديدة: ${opts.subject}`, html);
}

export async function sendTicketReplyEmail(opts: { to: string; subject: string; replyBody: string }) {
  const html = baseTemplate(`
    <h2>↩️ رد جديد على تذكرتك</h2>
    <p>تذكرة: <b>${opts.subject}</b></p>
    <p style="background:#f8fafc;border-radius:8px;padding:12px 16px;">${opts.replyBody}</p>
  `);
  return sendEmail(opts.to, `رد جديد على تذكرتك: ${opts.subject}`, html);
}

export async function sendTicketResolvedEmail(opts: { to: string; subject: string }) {
  const html = baseTemplate(`
    <h2>✅ تم حل تذكرتك</h2>
    <p>تذكرة: <b>${opts.subject}</b></p>
    <p>إذا احتجت أي مساعدة إضافية، فقط افتح تذكرة جديدة من البوابة.</p>
  `);
  return sendEmail(opts.to, `تم حل تذكرتك: ${opts.subject}`, html);
}
