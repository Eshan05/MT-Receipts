import type { TemplateComponent, TemplateInfo, TemplateProps } from './types'
import ProfessionalTemplate from './professional'

export const templateRegistry: Record<string, TemplateComponent> = {
  professional: ProfessionalTemplate,
}

export const templateInfo: Record<string, TemplateInfo> = {
  professional: {
    slug: 'professional',
    name: 'Professional',
    description:
      'Structured layout with bold typography and a modern professional feel.',
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

export const DEFAULT_TEMPLATE = 'minimal'
