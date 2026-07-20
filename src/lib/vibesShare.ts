export async function shareMixLink(url: string) {
  if (navigator.share) {
    return navigator.share({ title: "Apex360-IF Vibes Mix", url });
  }
  await navigator.clipboard.writeText(url);
  return true;
}
