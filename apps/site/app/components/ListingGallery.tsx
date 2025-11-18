import { useState } from "react";

type ListingGalleryProps = {
  images?: string[];
  alt?: string;
};

export default function ListingGallery({ images = [], alt = "" }: ListingGalleryProps) {
  const displayImages = images.length > 0 ? images : ["/placeholder1.jpg", "/placeholder2.jpg"];
  const [idx, setIdx] = useState(0);
  const currentImage = displayImages[idx];

  return (
    <div className="space-y-3">
      <div className="relative">
        <img
          src={currentImage}
          alt={alt}
          className="w-full rounded-2xl border border-white/10 object-cover max-h-[520px]"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== "/placeholder1.jpg") {
              target.src = "/placeholder1.jpg";
            }
          }}
        />
        {displayImages.length > 1 && (
          <>
            <div className="absolute inset-y-0 left-0 flex items-center">
              <button
                className="m-2 rounded-xl bg-black/40 px-3 py-2 text-sm hover:bg-black/60 transition-colors"
                onClick={() => setIdx((idx - 1 + displayImages.length) % displayImages.length)}
                aria-label="Previous"
              >
                ‹
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center">
              <button
                className="m-2 rounded-xl bg-black/40 px-3 py-2 text-sm hover:bg-black/60 transition-colors"
                onClick={() => setIdx((idx + 1) % displayImages.length)}
                aria-label="Next"
              >
                ›
              </button>
            </div>
          </>
        )}
      </div>

      {displayImages.length > 1 && (
        <div className="grid grid-cols-6 gap-2">
          {displayImages.map((src, i) => (
            <button
              key={i}
              className={`rounded-xl overflow-hidden border transition-opacity ${
                i === idx ? "border-white/80" : "border-white/10 opacity-70 hover:opacity-100"
              }`}
              onClick={() => setIdx(i)}
              aria-label={`Image ${i + 1}`}
            >
              <img
                src={src}
                alt={`${alt} ${i + 1}`}
                className="h-16 w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
