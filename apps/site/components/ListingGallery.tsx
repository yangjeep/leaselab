"use client";
import { useState } from "react";
import Image from "next/image";

export default function ListingGallery({ images = [] as string[], alt = "" }) {
  // 如果没有图片，显示 placeholders for demo
  const displayImages = images && images.length > 0 ? images : ["/placeholder1.jpg", "/placeholder2.jpg"];

  const [idx, setIdx] = useState(0);
  const currentImage = displayImages[idx];
  const isLocalImage = currentImage?.startsWith('/');

  return (
    <div className="space-y-3">
      <div className="relative">
        <Image
          src={currentImage}
          alt={alt}
          width={1200}
          height={520}
          className="w-full rounded-2xl border border-white/10 object-cover max-h-[520px]"
          priority={idx === 0}
          unoptimized={isLocalImage}
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            console.error(`Failed to load image: ${currentImage}`);
            if (currentImage !== "/placeholder1.jpg" && currentImage !== "/placeholder2.jpg") {
              (e.target as HTMLImageElement).src = "/placeholder1.jpg";
            }
          }}
        />
        {displayImages.length > 1 && (
          <>
            <div className="absolute inset-y-0 left-0 flex items-center">
              <button
                className="m-2 rounded-xl bg-black/40 px-3 py-2 text-sm"
                onClick={() => setIdx((idx - 1 + displayImages.length) % displayImages.length)}
                aria-label="Previous"
              >
                ‹
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center">
              <button
                className="m-2 rounded-xl bg-black/40 px-3 py-2 text-sm"
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
          {displayImages.map((src, i) => {
            const isThumbnailLocal = src?.startsWith('/');
            return (
              <button
                key={i}
                className={`rounded-xl overflow-hidden border ${i===idx ? "border-white/80" : "border-white/10 opacity-70 hover:opacity-100"}`}
                onClick={() => setIdx(i)}
                aria-label={`image ${i+1}`}
              >
                <Image 
                  src={src} 
                  alt={`${alt} ${i+1}`} 
                  width={100}
                  height={64}
                  className="h-16 w-full object-cover"
                  unoptimized={isThumbnailLocal}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
