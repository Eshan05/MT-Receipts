import type { TemplateComponent, TemplateInfo, TemplateProps } from './types'
import MinimalTemplate from './minimal'
import CorporateTemplate from './corporate'
import ModernTemplate from './modern'
import ClassicTemplate from './classic'
import ElegantTemplate from './elegant'
import CleanTemplate from './clean'
import DarkTemplate from './dark'
import ReceiptStyleTemplate from './receipt-style'

export const templateRegistry: Record<string, TemplateComponent> = {
  minimal: MinimalTemplate,
  corporate: CorporateTemplate,
  modern: ModernTemplate,
  classic: ClassicTemplate,
  elegant: ElegantTemplate,
  clean: CleanTemplate,
  dark: DarkTemplate,
  'receipt-style': ReceiptStyleTemplate,
}

export const templateInfo: Record<string, TemplateInfo> = {
  minimal: {
    slug: 'minimal',
    name: 'Minimal',
    description: 'Clean whitespace, elegant typography, minimal elements',
    category: 'minimal',
  },
  corporate: {
    slug: 'corporate',
    name: 'Corporate',
    description: 'Bold headers, structured tables, professional layout',
    category: 'professional',
  },
  modern: {
    slug: 'modern',
    name: 'Modern',
    description: 'Modern colors, rounded corners, fresh aesthetic',
    category: 'modern',
  },
  classic: {
    slug: 'classic',
    name: 'Classic',
    description: 'Classic black & white, no frills, utilitarian',
    category: 'classic',
  },
  elegant: {
    slug: 'elegant',
    name: 'Elegant',
    description: 'Centered layout, decorative borders, refined feel',
    category: 'themed',
  },
  clean: {
    slug: 'clean',
    name: 'Clean',
    description: 'Light background, simple borders, balanced spacing',
    category: 'minimal',
  },
  dark: {
    slug: 'dark',
    name: 'Dark Mode',
    description: 'Dark theme, bold contrasts, sleek appearance',
    category: 'themed',
  },
  'receipt-style': {
    slug: 'receipt-style',
    name: 'Receipt Style',
    description: 'Compact, printer-friendly, thermal receipt format',
    category: 'classic',
  },
}

export function getTemplateComponent(slug: string): TemplateComponent {
  return templateRegistry[slug] || MinimalTemplate
}

export function getTemplateInfo(slug: string): TemplateInfo | undefined {
  return templateInfo[slug]
}

export function getTemplateNames(): string[] {
  return Object.keys(templateRegistry)
}

export function getAllTemplateInfo(): TemplateInfo[] {
  return Object.values(templateInfo)
}

export const DEFAULT_TEMPLATE = 'minimal'
