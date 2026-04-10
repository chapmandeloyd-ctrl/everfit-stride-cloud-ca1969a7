import { EmailBlock } from "./types";

const LOGO_URL = "https://eexxmfuknqttujecbcho.supabase.co/storage/v1/object/public/email-assets/logo.png";

export function blocksToHtml(blocks: EmailBlock[]): string {
  const blockHtml = blocks.map(block => {
    switch (block.type) {
      case "heading": {
        const sizes = { 1: "22px", 2: "18px", 3: "16px" };
        const tag = `h${block.level || 1}`;
        return `<${tag} style="font-size:${sizes[block.level || 1]};font-weight:bold;color:#1e1e1e;margin:0 0 12px;text-align:${block.alignment || 'left'};font-family:'Space Grotesk',Arial,sans-serif">${escapeHtml(block.content)}</${tag}>`;
      }
      case "text":
        return `<p style="font-size:14px;color:#55575d;line-height:1.6;margin:0 0 16px;text-align:${block.alignment || 'left'};font-family:'Space Grotesk',Arial,sans-serif;white-space:pre-wrap">${escapeHtml(block.content)}</p>`;
      case "button":
        return `<div style="text-align:${block.alignment || 'center'};margin:16px 0"><a href="${escapeHtml(block.url || '#')}" style="display:inline-block;padding:12px 32px;background-color:#CC1A1A;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;font-family:'Space Grotesk',Arial,sans-serif">${escapeHtml(block.content)}</a></div>`;
      case "image":
        return `<div style="text-align:${block.alignment || 'center'};margin:16px 0"><img src="${escapeHtml(block.url || '')}" alt="${escapeHtml(block.alt || '')}" style="max-width:100%;height:auto;border-radius:6px" /></div>`;
      case "divider":
        return `<hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0" />`;
      case "spacer":
        return `<div style="height:${block.height || 20}px"></div>`;
      default:
        return "";
    }
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Space Grotesk',Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:30px 25px">
<div style="text-align:center;margin-bottom:24px">
<img src="${LOGO_URL}" alt="KSOM-360" width="80" height="80" style="display:block;margin:0 auto" />
</div>
${blockHtml}
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;text-align:center">
<p style="font-size:12px;color:#999999;margin:0;font-family:'Space Grotesk',Arial,sans-serif">© ${new Date().getFullYear()} KSOM-360. All rights reserved.</p>
</div>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
