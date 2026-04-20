import { Sparkles } from "lucide-react";

interface WelcomeCardProps {
  imageUrl?: string | null;
  message?: string | null;
  title?: string | null;
}

export function WelcomeCard({ imageUrl, message, title }: WelcomeCardProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden h-56">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: imageUrl
            ? `url(${imageUrl})`
            : "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.1), hsl(var(--muted)))",
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-5">
        <div className="flex justify-center items-center flex-1">
          <Sparkles className="h-10 w-10 text-white/40" />
        </div>
        {(title || message) && (
          <div>
            {title && (
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">{title}</p>
            )}
            {message && <p className="text-sm font-semibold text-white">{message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
