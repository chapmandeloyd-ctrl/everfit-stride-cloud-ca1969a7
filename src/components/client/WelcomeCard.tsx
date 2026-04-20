import { Sparkles } from "lucide-react";

interface WelcomeCardProps {
  imageUrl?: string | null;
  message?: string | null;
  title?: string | null;
  textColor?: string | null;
}

export function WelcomeCard({ imageUrl, message, title, textColor }: WelcomeCardProps) {
  const textStyle = textColor ? { color: textColor } : undefined;
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
          {title?.trim() ? (
            <h2 className="text-3xl font-bold tracking-wider text-white" style={textStyle}>{title}</h2>
          ) : (
            <Sparkles className="h-10 w-10 text-white/40" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white" style={textStyle}>
            {message || "Welcome to your fitness journey! Your coach will assign your first plan soon."}
          </p>
        </div>
      </div>
    </div>
  );
}
