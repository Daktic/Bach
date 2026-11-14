// Wikimedia Commons serves thumbnails at fixed widths, named in the URL:
// .../thumb/a/ab/File.jpg/960px-File.jpg. Swap that width so a small card
// doesn't download the large version. Other URLs are returned unchanged.

const WIKIMEDIA_THUMB = /^(https:\/\/(?:thumb|upload)\.wikimedia\.org\/.+\/thumb\/.+\/)\d+px-([^/]+)$/;

/** Wikimedia's standard thumbnail widths. */
export type WikimediaWidth = 250 | 330 | 500 | 960 | 1280;

export function sizedImage(src: string, width: WikimediaWidth): string {
  const m = WIKIMEDIA_THUMB.exec(src);
  return m ? `${m[1]}${width}px-${m[2]}` : src;
}
