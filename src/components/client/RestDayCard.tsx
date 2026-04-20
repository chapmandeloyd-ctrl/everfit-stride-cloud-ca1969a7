interface RestDayCardProps {
  imageUrl?: string;
  message?: string;
  title?: string;
  textColor?: string;
  overlayOpacity?: number;
}

export function RestDayCard({ imageUrl, message, title, textColor, overlayOpacity }: RestDayCardProps) {
  const overlayPct = overlayOpacity ?? 50;
  const textStyle = textColor ? { color: textColor } : undefined;
  return (
    <div className="relative rounded-2xl overflow-hidden h-56">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: imageUrl
            ? `url(${imageUrl})`
            : "linear-gradient(135deg, hsl(25 80% 40%), hsl(0 60% 30%), hsl(240 40% 20%))",
        }}
      />
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black to-transparent"
        style={{ opacity: overlayPct / 100 }}
      />
      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-5">
        <div className="flex justify-center items-center flex-1">
          <h2 className="text-4xl font-bold tracking-[0.3em] text-white/90 font-heading" style={textStyle}>
            {title?.trim() ? title : "RELAX"}
          </h2>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1" style={textStyle}>
            Rest Day
          </p>
          <p className="text-sm font-semibold text-white" style={textStyle}>
            {message || "No workouts scheduled for today. Enjoy your rest!"}
          </p>
        </div>
      </div>
    </div>
  );
}
