import { Resend } from "resend";
import { escapeHtml } from "./escapeHtml";

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

// Exported for the notify/send route, which explicitly awaits the result (unlike the
// fire-and-forget convention above) since it's the direct outcome of a deliberate user action.
export async function sendRawEmail(to: string | string[], subject: string, html: string) {
  return sendEmail(to, subject, html);
}

function baseTemplate(bodyHtml: string): string {
  return `<!DOCTYPE html>
  <html dir="rtl" lang="ar">
  <body dir="rtl" style="font-family:'Cairo',Tahoma,sans-serif;background:#f5f5f7;margin:0;padding:24px;direction:rtl;text-align:right;">
    <div dir="rtl" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;direction:rtl;text-align:right;">
      <div style="background:#0f172a;padding:20px 24px;">
        <span style="color:#fff;font-weight:700;font-size:18px;">Creative Code</span>
      </div>
      <div style="padding:24px;color:#1e293b;line-height:1.8;direction:rtl;text-align:right;">${bodyHtml}</div>
      <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px;direction:rtl;text-align:right;">
        هذه رسالة آلية من نظام Creative Code — لا حاجة للرد على هذا البريد.
      </div>
    </div>
  </body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="text-align:center;"><a href="${url}" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">${label}</a></p>`;
}

export async function sendPortalWelcomeEmail(opts: { to: string; name: string; password: string; loginUrl: string }) {
  const name = escapeHtml(opts.name);
  const html = baseTemplate(`
    <h2>مرحباً ${name}</h2>
    <p>تم إنشاء حساب لك على بوابة عملاء Creative Code لمتابعة مشاريعك أولاً بأول.</p>
    <p><b>البريد الإلكتروني:</b> ${opts.to}<br/><b>كلمة المرور:</b> ${escapeHtml(opts.password)}</p>
    ${button(opts.loginUrl, "تسجيل الدخول إلى البوابة")}
  `);
  return sendEmail(opts.to, "تم إنشاء حسابك في بوابة العملاء", html);
}

export async function sendStageApprovedEmail(opts: {
  to: string[]; clientName: string; projectName: string; stageTitle: string; comment?: string;
}) {
  const html = baseTemplate(`
    <h2>تم اعتماد مرحلة</h2>
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
    <h2>طلب تعديلات على مرحلة</h2>
    <p>العميل <b>${opts.clientName}</b> طلب تعديلات على المرحلة التالية من مشروع <b>${opts.projectName}</b>:</p>
    <p style="background:#fffbeb;border-radius:8px;padding:12px 16px;"><b>${opts.stageTitle}</b></p>
    ${opts.comment ? `<p><b>ملاحظة العميل:</b> ${opts.comment}</p>` : ""}
  `);
  return sendEmail(opts.to, `طلب تعديلات على "${opts.stageTitle}" — ${opts.projectName}`, html);
}

export const STAGE_STATUS_LABELS_AR: Record<string, string> = {
  not_started: "لم تبدأ",
  in_progress: "جارية",
  needs_review: "بانتظار مراجعة العميل",
  changes_requested: "طلب العميل تعديلات",
  approved: "معتمدة",
  completed: "مكتملة",
};

export function renderStageStatusChangedEmail(opts: {
  projectName: string; stageTitle: string; status: string; statusLabel: string; portalUrl: string;
}): { subject: string; html: string } {
  const projectName = escapeHtml(opts.projectName);
  const stageTitle = escapeHtml(opts.stageTitle);
  const statusLabel = escapeHtml(opts.statusLabel);
  const html = baseTemplate(`
    <h2>تحديث على مرحلة من مشروعك</h2>
    <p>تحدّثت حالة مرحلة من مشروع <b>${projectName}</b>:</p>
    <p style="background:#f8fafc;border-radius:8px;padding:12px 16px;"><b>${stageTitle}</b><br/>الحالة الجديدة: <b>${statusLabel}</b></p>
    ${button(opts.portalUrl, "متابعة المشروع في البوابة")}
  `);
  return { subject: `تحديث مرحلة "${opts.stageTitle}" — ${opts.projectName}`, html };
}

export function renderNewDeliverableEmail(opts: {
  projectName: string; deliverableTitle: string; deliverableDescription?: string | null; portalUrl: string;
}): { subject: string; html: string } {
  const projectName = escapeHtml(opts.projectName);
  const deliverableTitle = escapeHtml(opts.deliverableTitle);
  const html = baseTemplate(`
    <h2>تسليم جديد</h2>
    <p>تم رفع تسليم جديد لمشروع <b>${projectName}</b>: <b>${deliverableTitle}</b></p>
    ${opts.deliverableDescription ? `<p style="background:#f8fafc;border-radius:8px;padding:12px 16px;">${escapeHtml(opts.deliverableDescription)}</p>` : ""}
    ${button(opts.portalUrl, "عرض التسليم")}
  `);
  return { subject: `تسليم جديد — ${opts.projectName}`, html };
}

export function renderPaymentReceivedEmail(opts: {
  projectName: string; paymentLabel: string; amount: string; portalUrl: string;
}): { subject: string; html: string } {
  const projectName = escapeHtml(opts.projectName);
  const paymentLabel = escapeHtml(opts.paymentLabel);
  const html = baseTemplate(`
    <h2>تم استلام دفعة</h2>
    <p>تم تسجيل استلام دفعة من مشروع <b>${projectName}</b>:</p>
    <p style="background:#f0fdf4;border-radius:8px;padding:12px 16px;"><b>${paymentLabel}</b> — ${opts.amount} د.أ</p>
    ${button(opts.portalUrl, "عرض تفاصيل الدفعات")}
  `);
  return { subject: `تم استلام دفعة — ${opts.projectName}`, html };
}

export function renderNewPaymentEmail(opts: {
  projectName: string; paymentLabel: string; amount: string; dueDate?: string | null; portalUrl: string;
}): { subject: string; html: string } {
  const projectName = escapeHtml(opts.projectName);
  const paymentLabel = escapeHtml(opts.paymentLabel);
  const html = baseTemplate(`
    <h2>دفعة جديدة على مشروعك</h2>
    <p>تمت جدولة دفعة جديدة على مشروع <b>${projectName}</b>:</p>
    <p style="background:#f8fafc;border-radius:8px;padding:12px 16px;">
      <b>${paymentLabel}</b> — ${opts.amount} د.أ
      ${opts.dueDate ? `<br/>تاريخ الاستحقاق: ${escapeHtml(opts.dueDate)}` : ""}
    </p>
    ${button(opts.portalUrl, "عرض تفاصيل الدفعات")}
  `);
  return { subject: `دفعة جديدة — ${opts.projectName}`, html };
}

export function renderContractUploadedEmail(opts: {
  projectName: string; totalValue: string; portalUrl: string;
}): { subject: string; html: string } {
  const projectName = escapeHtml(opts.projectName);
  const html = baseTemplate(`
    <h2>تم رفع عقد مشروعك</h2>
    <p>تم رفع عقد مشروع <b>${projectName}</b> بقيمة إجمالية <b>${opts.totalValue} د.أ</b>.</p>
    ${button(opts.portalUrl, "عرض العقد")}
  `);
  return { subject: `عقد المشروع — ${opts.projectName}`, html };
}

export function renderStaffCommentEmail(opts: {
  projectName: string; staffName: string; commentBody: string; portalUrl: string;
}): { subject: string; html: string } {
  const projectName = escapeHtml(opts.projectName);
  const staffName = escapeHtml(opts.staffName);
  const commentBody = escapeHtml(opts.commentBody);
  const html = baseTemplate(`
    <h2>رد جديد من فريقنا</h2>
    <p><b>${staffName}</b> أضاف رداً على مشروع <b>${projectName}</b>:</p>
    <p style="background:#f8fafc;border-radius:8px;padding:12px 16px;">${commentBody}</p>
    ${button(opts.portalUrl, "متابعة المحادثة")}
  `);
  return { subject: `رد جديد على مشروعك — ${opts.projectName}`, html };
}

export function renderProjectSummaryEmail(opts: {
  projectName: string;
  portalUrl: string;
  deliverables: { title: string; description: string | null; type: "file" | "link"; actionLabel: string }[];
}): { subject: string; html: string } {
  const projectName = escapeHtml(opts.projectName);
  const itemsHtml = opts.deliverables.length
    ? opts.deliverables.map((d) => `
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:10px;">
          <b>${escapeHtml(d.title)}</b> <span style="color:#64748b;font-size:12px;">(${escapeHtml(d.actionLabel)})</span>
          ${d.description ? `<p style="margin:6px 0 0;color:#475569;">${escapeHtml(d.description)}</p>` : ""}
        </div>
      `).join("")
    : `<p style="color:#64748b;">لا توجد تسليمات مضافة بعد.</p>`;
  const html = baseTemplate(`
    <h2>ملخص تسليمات مشروعك</h2>
    <p>هذا ملخص شامل لكل التسليمات المتوفرة حتى الآن على مشروع <b>${projectName}</b>:</p>
    ${itemsHtml}
    <p>يمكنك متابعة تقدم المشروع أولاً بأول واعتماد التسليمات مباشرة من بوابة العملاء الخاصة بك.</p>
    ${button(opts.portalUrl, "فتح بوابة العملاء")}
  `);
  return { subject: `ملخص تسليمات مشروعك — ${opts.projectName}`, html };
}

export function renderFinancialSummaryEmail(opts: {
  projectName: string;
  portalUrl: string;
  contract: { totalValue: string; fileName: string } | null;
  payments: { label: string; amount: string; status: "pending" | "received"; dueDate: string | null }[];
}): { subject: string; html: string } {
  const projectName = escapeHtml(opts.projectName);
  const contractHtml = opts.contract
    ? `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;">العقد</p>
        <b>${escapeHtml(opts.contract.fileName)}</b> — القيمة الإجمالية: <b>${escapeHtml(opts.contract.totalValue)} د.أ</b>
      </div>`
    : "";
  const paymentsHtml = opts.payments.length
    ? opts.payments.map((p) => `
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:10px;">
          <b>${escapeHtml(p.label)}</b> — ${escapeHtml(p.amount)} د.أ
          <span style="color:${p.status === "received" ? "#16a34a" : "#d97706"};font-size:12px;"> (${p.status === "received" ? "تم الاستلام" : "قيد الانتظار"})</span>
          ${p.dueDate ? `<p style="margin:6px 0 0;color:#475569;">تاريخ الاستحقاق: ${escapeHtml(p.dueDate)}</p>` : ""}
        </div>
      `).join("")
    : `<p style="color:#64748b;">لا توجد دفعات مضافة بعد.</p>`;
  const html = baseTemplate(`
    <h2>التفاصيل المالية لمشروعك</h2>
    <p>هذا ملخص شامل للتفاصيل المالية لمشروع <b>${projectName}</b>:</p>
    ${contractHtml}
    ${paymentsHtml}
    ${button(opts.portalUrl, "فتح بوابة العملاء")}
  `);
  return { subject: `التفاصيل المالية لمشروعك — ${opts.projectName}`, html };
}

export async function sendNewClientCommentEmail(opts: {
  to: string[]; clientName: string; projectName: string; commentBody: string;
}) {
  const html = baseTemplate(`
    <h2>تعليق جديد من العميل</h2>
    <p><b>${opts.clientName}</b> أضاف تعليقاً على مشروع <b>${opts.projectName}</b>:</p>
    <p style="background:#f8fafc;border-radius:8px;padding:12px 16px;">${opts.commentBody}</p>
  `);
  return sendEmail(opts.to, `تعليق جديد — ${opts.projectName}`, html);
}

export async function sendNewTicketEmail(opts: {
  to: string[]; clientName: string; subject: string; priority: string; ticketUrl: string;
}) {
  const html = baseTemplate(`
    <h2>تذكرة دعم جديدة</h2>
    <p>فتح العميل <b>${opts.clientName}</b> تذكرة دعم جديدة:</p>
    <p style="background:#f8fafc;border-radius:8px;padding:12px 16px;"><b>${opts.subject}</b><br/>الأولوية: ${opts.priority}</p>
  `);
  return sendEmail(opts.to, `تذكرة دعم جديدة: ${opts.subject}`, html);
}

export async function sendTicketReplyEmail(opts: { to: string; subject: string; replyBody: string }) {
  const html = baseTemplate(`
    <h2>رد جديد على تذكرتك</h2>
    <p>تذكرة: <b>${opts.subject}</b></p>
    <p style="background:#f8fafc;border-radius:8px;padding:12px 16px;">${opts.replyBody}</p>
  `);
  return sendEmail(opts.to, `رد جديد على تذكرتك: ${opts.subject}`, html);
}

export async function sendTicketResolvedEmail(opts: { to: string; subject: string }) {
  const html = baseTemplate(`
    <h2>تم حل تذكرتك</h2>
    <p>تذكرة: <b>${opts.subject}</b></p>
    <p>إذا احتجت أي مساعدة إضافية، فقط افتح تذكرة جديدة من البوابة.</p>
  `);
  return sendEmail(opts.to, `تم حل تذكرتك: ${opts.subject}`, html);
}
