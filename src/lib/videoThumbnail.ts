export function getVideoThumbnail(url: string): string {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  return "";
}

export async function generateAndUploadThumbnail(videoUrl: string, _trainerId?: string): Promise<string | null> {
  return getVideoThumbnail(videoUrl) || null;
}
