import photoManifest from "@/assets/moods/real/manifest.json";

export type StockPhoto = {
  id: string;
  label: string;
  feeling: string;
  src: string;
  filename: string;
  title?: string;
  creator?: string | null;
  sourceUrl?: string | null;
  license?: string | null;
  licenseUrl?: string | null;
};

export type StockPhotoAlbum = {
  id: string;
  label: string;
  hint: string;
  photos: StockPhoto[];
};

type ManifestPhoto = {
  album: string;
  index: number;
  id: string;
  label: string;
  feeling: string;
  filename: string;
  title?: string;
  creator?: string | null;
  source_url?: string | null;
  license?: string | null;
  license_url?: string | null;
};

const photoUrls = import.meta.glob("../assets/moods/real/*.jpg", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const albumDetails = [
  { id: "peace", label: "Peace", hint: "quiet and still" },
  { id: "hope", label: "Hope", hint: "new beginnings" },
  { id: "comfort", label: "Comfort", hint: "held close" },
  { id: "gratitude", label: "Gratitude", hint: "small mercies" },
  { id: "lament", label: "Lament", hint: "honest sorrow" },
  { id: "courage", label: "Courage", hint: "steady steps" },
  { id: "healing", label: "Healing", hint: "gentle recovery" },
  { id: "provision", label: "Provision", hint: "needs met" },
] as const;

const photos = (photoManifest as ManifestPhoto[]).map((photo): StockPhoto => {
  const assetPath = `../assets/moods/real/${photo.album}-${String(photo.index).padStart(2, "0")}.jpg`;
  return {
    id: photo.id,
    label: photo.label,
    feeling: photo.feeling,
    src: photoUrls[assetPath],
    filename: photo.filename,
    title: photo.title,
    creator: photo.creator,
    sourceUrl: photo.source_url,
    license: photo.license,
    licenseUrl: photo.license_url,
  };
});

export const STOCK_PHOTO_ALBUMS: StockPhotoAlbum[] = albumDetails.map(album => ({
  ...album,
  photos: photos.filter(photo => photo.id.startsWith(`${album.id}-`)),
}));

export const STOCK_PHOTOS: StockPhoto[] = STOCK_PHOTO_ALBUMS.flatMap(album => album.photos);

export async function stockPhotoToFile(photo: StockPhoto) {
  const res = await fetch(photo.src);
  if (!res.ok) throw new Error("That photo could not be opened.");
  const blob = await res.blob();
  return new File([blob], photo.filename, { type: blob.type || "image/jpeg" });
}
