import { EmailBlock } from "./types";
import { cn } from "@/lib/utils";

interface EmailPreviewProps {
  subject: string;
  blocks: EmailBlock[];
  previewMode: "desktop" | "mobile";
}

function renderBlock(block: EmailBlock) {
  switch (block.type) {
    case "heading": {
      const sizes = { 1: "text-2xl", 2: "text-xl", 3: "text-lg" };
      return (
        <div key={block.id} style={{ textAlign: block.alignment || "left" }}>
          <span className={cn("font-bold text-foreground", sizes[block.level || 1])}>
            {block.content || "Heading"}
          </span>
        </div>
      );
    }
    case "text":
      return (
        <p key={block.id} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap" style={{ textAlign: block.alignment || "left" }}>
          {block.content || "Text content..."}
        </p>
      );
    case "button":
      return (
        <div key={block.id} style={{ textAlign: block.alignment || "center" }} className="py-1">
          <span className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium">
            {block.content || "Button"}
          </span>
        </div>
      );
    case "image":
      return (
        <div key={block.id} style={{ textAlign: block.alignment || "center" }}>
          {block.url ? (
            <img src={block.url} alt={block.alt || ""} className="max-w-full h-auto rounded" />
          ) : (
            <div className="w-full h-32 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
              Image placeholder
            </div>
          )}
        </div>
      );
    case "divider":
      return <hr key={block.id} className="border-border my-2" />;
    case "spacer":
      return <div key={block.id} style={{ height: block.height || 20 }} />;
    default:
      return null;
  }
}

export function EmailPreview({ subject, blocks, previewMode }: EmailPreviewProps) {
  return (
    <div className={cn(
      "bg-background border border-border rounded-lg overflow-hidden mx-auto transition-all",
      previewMode === "mobile" ? "max-w-[375px]" : "max-w-[600px]"
    )}>
      {/* Email header */}
      <div className="bg-muted/50 px-4 py-3 border-b border-border">
        <p className="text-xs text-muted-foreground">From: KSOM-360 &lt;noreply@ksom-360.app&gt;</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{subject || "(No subject)"}</p>
      </div>

      {/* Email body */}
      <div className="p-6 space-y-4 bg-white">
        {/* Logo */}
        <div className="text-center pb-2">
          <img src="https://eexxmfuknqttujecbcho.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="KSOM-360" className="h-16 w-16 mx-auto" />
        </div>

        {blocks.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            Add blocks to start building your email
          </p>
        ) : (
          blocks.map(renderBlock)
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border mt-6">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} KSOM-360. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
