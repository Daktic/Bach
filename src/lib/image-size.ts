// Wikimedia Commons serves thumbnails at fixed widths, named in the URL:
// .../thumb/a/ab/File.jpg/960px-File.jpg. Swap that width (or turn a link to
// the original file into a thumbnail link) so a small card doesn't download
// the large version. Other URLs are returned unchanged.

const WIKIMEDIA_THUMB = /^(https:\/\/(?:thumb|upload)\.wikimedia\.org\/.+\/thumb\/.+\/)\d+px-([^/]+)$/;
const WIKIMEDIA_ORIGINAL = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/;

/** Wikimedia's standard thumbnail widths. */
export type WikimediaWidth = 250 | 330 | 500 | 960 | 1280;

export function sizedImage(src: string, width: WikimediaWidth): string {
  const thumb = WIKIMEDIA_THUMB.exec(src);
  if (thumb) return `${thumb[1]}${width}px-${thumb[2]}`;
  const original = WIKIMEDIA_ORIGINAL.exec(src);
  if (original) {
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${original[1]}/${original[2]}/${width}px-${original[2]}`;
  }
  return src;
}
