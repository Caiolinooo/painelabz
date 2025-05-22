"use client"

import dynamic from "next/dynamic"

// Importar o ThemeEnforcer de forma dinâmica para garantir que ele seja executado apenas no cliente
const ThemeEnforcer = dynamic(() => import("@/components/ThemeEnforcer"), { ssr: false })

export default function ThemeEnforcerWrapper() {
  return <ThemeEnforcer />
}
