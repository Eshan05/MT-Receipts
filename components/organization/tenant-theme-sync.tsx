'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

function hexToHslTuple(hex: string): string | null {
  const normalized = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null
  }

  const red = parseInt(normalized.slice(0, 2), 16) / 255
  const green = parseInt(normalized.slice(2, 4), 16) / 255
  const blue = parseInt(normalized.slice(4, 6), 16) / 255

  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let hue = 0
  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6
    } else if (max === green) {
      hue = (blue - red) / delta + 2
    } else {
      hue = (red - green) / delta + 4
    }
  }

  hue = Math.round(hue * 60)
  if (hue < 0) hue += 360

  const lightness = (max + min) / 2
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))

  return `${hue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`
}

export function TenantThemeSync() {
  const { currentOrganization } = useAuth()

  useEffect(() => {
    const root = document.documentElement
    const trackedVars = [
      '--tenant-primary',
      '--tenant-secondary',
      '--primary',
      '--ring',
      '--sidebar-primary',
      '--sidebar-ring',
    ]

    const previousValues = new Map<string, string>()
    for (const variable of trackedVars) {
      previousValues.set(variable, root.style.getPropertyValue(variable))
    }

    const resetThemeVars = () => {
      for (const variable of trackedVars) {
        const previous = previousValues.get(variable)
        if (!previous) {
          root.style.removeProperty(variable)
        } else {
          root.style.setProperty(variable, previous)
        }
      }
    }

    if (!currentOrganization?.slug) {
      resetThemeVars()
      return
    }

    let isCancelled = false

    const syncTheme = async () => {
      try {
        const response = await fetch(
          `/api/organizations/${currentOrganization.slug}`
        )
        if (!response.ok) return

        const data = await response.json()
        const primaryHex = data?.settings?.primaryColor
        const secondaryHex = data?.settings?.secondaryColor

        if (isCancelled) return

        if (typeof primaryHex === 'string' && primaryHex.startsWith('#')) {
          root.style.setProperty('--tenant-primary', primaryHex)
          const primaryHsl = hexToHslTuple(primaryHex)
          if (primaryHsl) {
            root.style.setProperty('--primary', primaryHsl)
            root.style.setProperty('--ring', primaryHsl)
            root.style.setProperty('--sidebar-primary', primaryHsl)
            root.style.setProperty('--sidebar-ring', primaryHsl)
          }
        }

        if (typeof secondaryHex === 'string' && secondaryHex.startsWith('#')) {
          root.style.setProperty('--tenant-secondary', secondaryHex)
        }
      } catch {}
    }

    void syncTheme()

    return () => {
      isCancelled = true
      resetThemeVars()
    }
  }, [currentOrganization?.slug])

  return null
}
