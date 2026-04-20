interface RestDayCardProps {
  imageUrl?: string;
  message?: string;
}

export function RestDayCard({ imageUrl, message }: RestDayCardProps) {
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-5">
        <div className="flex justify-center items-center flex-1">
          <h2 className="text-4xl font-bold tracking-[0.3em] text-white/90 font-heading">
            RELAX
          </h2>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
            Rest Day
          </p>
          <p className="text-sm font-semibold text-white">
            {message || "No workouts scheduled for today. Enjoy your rest!"}
          </p>
        </div>
      </div>
    </div>
  );
}
