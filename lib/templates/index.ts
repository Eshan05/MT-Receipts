import type { TemplateComponent, TemplateInfo, TemplateProps } from './types'
import ProfessionalTemplate from './professional'
import ProfessionalDarkTemplate from './professional-dark'
import AProfessionalTemplate from '@/lib/templates/aces-professional'

export const templateRegistry: Record<string, TemplateComponent> = {
  professional: ProfessionalTemplate,
  'professional-dark': ProfessionalDarkTemplate,
  'aces-professional': AProfessionalTemplate,
}

export const templateInfo: Record<string, TemplateInfo> = {
  professional: {
    slug: 'professional',
    name: 'Professional',
    description:
      'Structured layout with bold typography and a modern professional feel.',
    category: 'professional',
  },
  'professional-dark': {
    slug: 'professional-dark',
    name: 'Professional Dark',
    description:
      'Dark mode variant with neutral zinc tones and sky blue accents.',
    category: 'professional',
  },
  'aces-professional': {
    slug: 'aces-professional',
    name: 'ACES Professional',
    description:
      'A professional template inspired by the ACES brand, featuring a clean layout and bold typography.',
    category: 'professional',
  },
}

export function getTemplateComponent(slug: string): TemplateComponent {
  return templateRegistry[slug] || ProfessionalTemplate
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

export const DEFAULT_TEMPLATE = 'professional'
