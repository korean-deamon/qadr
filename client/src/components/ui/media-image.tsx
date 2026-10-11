"use client"

import Image, { type ImageLoaderProps, type ImageProps } from "next/image"

const LOCAL_WIDTHS = [480, 960, 1600]

/**
 * Loader for user media: local WebP variants (`-480/-960/-1600.webp`) or
 * Cloudinary on-the-fly transforms (f_auto, q_auto, width). No Next optimizer hop.
 */
function mediaLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.includes("res.cloudinary.com")) {
    return src.replace("/upload/", `/upload/f_auto,q_${quality ?? "auto"},c_limit,w_${width}/`)
  }
  const m = src.match(/^(.*)-(\d+)\.webp$/)
  if (!m) return src
  const best = LOCAL_WIDTHS.find((w) => w >= width) ?? LOCAL_WIDTHS[LOCAL_WIDTHS.length - 1]
  return `${m[1]}-${best}.webp`
}

export function MediaImage({ alt, ...props }: Omit<ImageProps, "loader">) {
  return <Image loader={mediaLoader} alt={alt} {...props} />
}
