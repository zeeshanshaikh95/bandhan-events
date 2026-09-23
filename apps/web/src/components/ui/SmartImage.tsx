import { useState } from "react";
import { imageFallback, type SiteImage } from "@/data/images";
import { imageIntrinsicSize, imageSrcSet } from "@/utils/imageSrcSet";
import { publicPath } from "@/utils/publicPath";
import { cn } from "@/utils/cn";

interface SmartImageProps {
  image: SiteImage;
  /** Load eagerly as the likely LCP candidate (above the fold). */
  priority?: boolean;
  sizes?: string;
  /** Classes for the wrapper (layout + aspect ratio). */
  className?: string;
  /** Classes for the img element itself. */
  imgClassName?: string;
}

/**
 * Single image element used across the site:
 * - reserves space via width/height (no layout shift)
 * - serves a responsive WebP `srcset` built from the generated manifest
 * - lazy-loads + async-decodes by default, eager for priority images
 * - falls back to a known-good image if a file is missing
 */
export default function SmartImage({
  image,
  priority = false,
  sizes,
  className,
  imgClassName,
}: SmartImageProps) {
  const [src, setSrc] = useState(() => publicPath(image.src));
  const broken = src !== publicPath(image.src);
  const srcSet = broken ? undefined : imageSrcSet(image);
  const resolvedSizes = srcSet ? sizes ?? "100vw" : undefined;
  const { width, height } = imageIntrinsicSize(image);

  return (
    <div className={cn("overflow-hidden", className)}>
      <img
        src={src}
        srcSet={srcSet}
        sizes={resolvedSizes}
        alt={image.alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        /*
         * React 18 does not map `fetchPriority` on <img> yet, so the attribute
         * is passed through in lowercase (no dev warning, same DOM result).
         */
        {...(priority ? ({ fetchpriority: "high" } as Record<string, string>) : {})}
        onError={() => {
          if (!broken) setSrc(publicPath(imageFallback));
        }}
        className={cn("h-full w-full object-cover", imgClassName)}
      />
    </div>
  );
}
