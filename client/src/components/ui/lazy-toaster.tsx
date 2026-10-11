"use client"

import dynamic from "next/dynamic"

export const LazyToaster = dynamic(() => import("./toaster").then((m) => m.Toaster), { ssr: false })
