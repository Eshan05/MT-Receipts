'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Building2Icon,
  Loader2Icon,
  Link2Icon,
  Hash,
  Text,
  Palette,
  GripVertical,
  X,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ColorPickerOutput, RgbaValue } from '@/components/derived/color-picker'
import { Button } from '@/components/ui/button'
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerAlpha,
  ColorPickerFormat,
} from '@/components/derived/color-picker'
import { motion, Reorder } from 'framer-motion'

interface OrganizationSettings {
  name: string
  description: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  receiptNumberFormat: string
}

interface OrganizationSettingsCredenzaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'tenant' | 'superadmin'
  organizationSlug?: string
  onUpdated?: () => void
}

interface FormatToken {
  id: string
  type: 'static' | 'placeholder'
  value: string
  label?: string
}

interface ExampleData {
  eventCode: string
  initials: string
  seq: string
  orgCode: string
  year: string
  yy: string
  month: string
  type: string
}

const PLACEHOLDER_TOKENS: { value: string; label: string }[] = [
  { value: '{eventCode}', label: 'Event Code' },
  { value: '{initials}', label: 'Initials' },
  { value: '{seq}', label: 'Sequence' },
  { value: '{orgCode}', label: 'Org Code' },
  { value: '{year}', label: 'Year' },
  { value: '{yy}', label: 'YY' },
  { value: '{month}', label: 'Month' },
  { value: '{type}', label: 'Type' },
]

function parseFormatTokens(format: string): FormatToken[] {
  const tokens: FormatToken[] = []
  const regex = /(\{[^}]+\})|([^{}]+)/g
  let match: RegExpExecArray | null
  let id = 0

  while ((match = regex.exec(format)) !== null) {
    if (match[1]) {
      const placeholder = PLACEHOLDER_TOKENS.find((p) => p.value === match![1])
      tokens.push({
        id: `token-${id++}`,
        type: 'placeholder',
        value: match[1],
        label: placeholder?.label || match[1],
      })
    } else if (match[2]) {
      tokens.push({
        id: `token-${id++}`,
        type: 'static',
        value: match[2],
      })
    }
  }

  return tokens
}

function tokensToFormat(tokens: FormatToken[]): string {
  return tokens.map((t) => t.value).join('')
}

function renderFormatExample(format: string, data: ExampleData): string {
  return format
    .replaceAll('{eventCode}', data.eventCode)
    .replaceAll('{initials}', data.initials)
    .replaceAll('{seq}', data.seq)
    .replaceAll('{orgCode}', data.orgCode)
    .replaceAll('{year}', data.year)
    .replaceAll('{yy}', data.yy)
    .replaceAll('{month}', data.month)
    .replaceAll('{type}', data.type)
}

function areTokenListsEqual(a: FormatToken[], b: FormatToken[]): boolean {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index++) {
    if (a[index].type !== b[index].type || a[index].value !== b[index].value) {
      return false
    }
  }
  return true
}

export function OrganizationSettingsCredenza({
  open,
  onOpenChange,
  mode = 'tenant',
  organizationSlug,
  onUpdated,
}: OrganizationSettingsCredenzaProps) {
  const { currentOrganization } = useAuth()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<OrganizationSettings>({
    name: '',
    description: '',
    logoUrl: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    receiptNumberFormat: 'RCP-{eventCode}-{initials}{seq}',
  })
  const [formatTokens, setFormatTokens] = useState<FormatToken[]>([])

  const exampleRows: ExampleData[] = [
    {
      eventCode: 'HACK2026',
      initials: 'AR',
      seq: '00017',
      orgCode: 'ACES',
      year: '2026',
      yy: '26',
      month: '02',
      type: 'HAC',
    },
    {
      eventCode: 'WORKSHOP07',
      initials: 'MK',
      seq: '00129',
      orgCode: 'ROBO',
      year: '2026',
      yy: '26',
      month: '11',
      type: 'WRK',
    },
    {
      eventCode: 'MEETUPX',
      initials: 'SJ',
      seq: '00003',
      orgCode: 'TECH',
      year: '2027',
      yy: '27',
      month: '01',
      type: 'MET',
    },
  ]

  const isSuperadminMode = mode === 'superadmin'
  const targetSlug = organizationSlug ?? currentOrganization?.slug
  const canEdit = isSuperadminMode
    ? true
    : currentOrganization?.role === 'admin'

  const loadSettings = useCallback(async () => {
    if (!targetSlug) return
    try {
      const res = await fetch(
        isSuperadminMode
          ? `/api/admins/organizations/${targetSlug}`
          : `/api/organizations/${targetSlug}`
      )
      if (res.ok) {
        const data = await res.json()
        const source = isSuperadminMode ? data.organization || {} : data
        const receiptNumberFormat =
          source.settings?.receiptNumberFormat ||
          'RCP-{eventCode}-{initials}{seq}'
        setSettings({
          name: source.name || '',
          description: source.description || '',
          logoUrl: source.logoUrl || '',
          primaryColor: source.settings?.primaryColor || '#3b82f6',
          secondaryColor: source.settings?.secondaryColor || '#1e40af',
          receiptNumberFormat,
        })
        setFormatTokens(parseFormatTokens(receiptNumberFormat))
      }
    } catch {
      toast.error('Failed to load settings')
    }
  }, [isSuperadminMode, targetSlug])

  useEffect(() => {
    if (open) {
      void loadSettings()
    }
  }, [open, loadSettings])

  const addToken = (token: { value: string; label: string }) => {
    const newToken: FormatToken = {
      id: `token-${Date.now()}`,
      type: 'placeholder',
      value: token.value,
      label: token.label,
    }
    const newTokens = [...formatTokens, newToken]
    setFormatTokens(newTokens)
    setSettings({ ...settings, receiptNumberFormat: tokensToFormat(newTokens) })
  }

  const addStaticText = () => {
    const newToken: FormatToken = {
      id: `token-${Date.now()}`,
      type: 'static',
      value: '',
    }
    const newTokens = [...formatTokens, newToken]
    setFormatTokens(newTokens)
    setSettings({ ...settings, receiptNumberFormat: tokensToFormat(newTokens) })
  }

  const removeToken = (id: string) => {
    const newTokens = formatTokens.filter((t) => t.id !== id)
    setFormatTokens(newTokens)
    setSettings({ ...settings, receiptNumberFormat: tokensToFormat(newTokens) })
  }

  const updateTokenValue = (id: string, value: string) => {
    const newTokens = formatTokens.map((t) =>
      t.id === id ? { ...t, value } : t
    )
    setFormatTokens(newTokens)
    setSettings({ ...settings, receiptNumberFormat: tokensToFormat(newTokens) })
  }

  const handleReorder = (newTokens: FormatToken[]) => {
    setFormatTokens(newTokens)
    setSettings({ ...settings, receiptNumberFormat: tokensToFormat(newTokens) })
  }

  const handleReceiptFormatChange = (value: string) => {
    setSettings((previous) => ({
      ...previous,
      receiptNumberFormat: value,
    }))

    const parsedTokens = parseFormatTokens(value)
    setFormatTokens((previous) =>
      areTokenListsEqual(previous, parsedTokens) ? previous : parsedTokens
    )
  }

  const saveSettings = async () => {
    if (!canEdit) {
      toast.error('Only admins can update organization settings')
      return
    }

    if (!targetSlug) {
      toast.error('No organization selected')
      return
    }

    setLoading(true)
    try {
      const url = isSuperadminMode
        ? `/api/admins/organizations/${targetSlug}`
        : `/api/organizations/${targetSlug}`

      const body = isSuperadminMode
        ? {
            action: 'config',
            name: settings.name,
            description: settings.description,
            logoUrl: settings.logoUrl.trim() || undefined,
            settings: {
              primaryColor: settings.primaryColor,
              secondaryColor: settings.secondaryColor,
              receiptNumberFormat: settings.receiptNumberFormat,
            },
          }
        : {
            name: settings.name,
            description: settings.description,
            logoUrl: settings.logoUrl.trim() || undefined,
            settings: {
              primaryColor: settings.primaryColor,
              secondaryColor: settings.secondaryColor,
              receiptNumberFormat: settings.receiptNumberFormat,
            },
          }

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(
          isSuperadminMode
            ? 'Configuration updated by superadmin'
            : 'Settings updated'
        )
        onUpdated?.()
        onOpenChange(false)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update settings')
      }
    } catch {
      toast.error('Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  if (!targetSlug) return null

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className='sm:max-w-lg'>
        <CredenzaHeader>
          <CredenzaTitle className=''>
            {isSuperadminMode ? 'Organization Config' : 'Organization Settings'}
          </CredenzaTitle>
          <CredenzaDescription>
            {isSuperadminMode
              ? 'Superadmin override mode. Updates here bypass organization admin controls.'
              : "Manage your organization's appearance and settings."}
          </CredenzaDescription>
        </CredenzaHeader>

        <CredenzaBody className='space-y-2 overflow-y-auto no-scrollbar'>
          <Field>
            <FieldLabel htmlFor='name'>Organization Name</FieldLabel>
            <div className='relative'>
              <Input
                id='name'
                value={settings.name}
                onChange={(e) =>
                  setSettings({ ...settings, name: e.target.value })
                }
                placeholder='ACES'
                readOnly={!canEdit}
                className='peer ps-7'
              />
              <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <Building2Icon size={12} />
              </div>
            </div>
          </Field>

          <Field>
            {/* <FieldLabel htmlFor='description'>Description</FieldLabel> */}
            <div className='relative'>
              <Textarea
                id='description'
                value={settings.description}
                onChange={(e) =>
                  setSettings({ ...settings, description: e.target.value })
                }
                placeholder='Association of Computer Engineering Students'
                readOnly={!canEdit}
                rows={2}
                className='peer ps-7 resize-none'
              />
              <div className='pointer-events-none absolute top-2.5 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <Text size={12} />
              </div>
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor='logoUrl'>Logo URL</FieldLabel>
            <div className='relative'>
              <Input
                id='logoUrl'
                value={settings.logoUrl}
                onChange={(e) =>
                  setSettings({ ...settings, logoUrl: e.target.value })
                }
                placeholder='https://example.com/logo.png'
                readOnly={!canEdit}
                className='peer ps-7'
              />
              <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <Link2Icon size={12} />
              </div>
            </div>
          </Field>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <FieldLabel className='text-xs font-medium flex items-center gap-1.5'>
                <Palette className='w-3 h-3' />
                Primary Color
              </FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    className='w-full justify-start gap-2 h-8'
                    disabled={!canEdit}
                  >
                    <div
                      className='w-4 h-4 rounded border'
                      style={{ backgroundColor: settings.primaryColor }}
                    />
                    {settings.primaryColor}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-64 p-3' align='start'>
                  <ColorPicker
                    value={settings.primaryColor}
                    onChange={(rgba: RgbaValue) => {
                      const r = Math.round(rgba[0])
                      const g = Math.round(rgba[1])
                      const b = Math.round(rgba[2])
                      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                      setSettings({ ...settings, primaryColor: hex })
                    }}
                    className='flex flex-col gap-2'
                  >
                    <ColorPickerSelection className='h-40 rounded-md' />
                    <ColorPickerHue />
                    <ColorPickerAlpha />
                    <div className='flex items-center gap-2'>
                      <ColorPickerOutput />
                      <ColorPickerFormat />
                    </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </div>
            <div className='space-y-1.5'>
              <FieldLabel className='text-xs font-medium flex items-center gap-1.5'>
                <Palette className='w-3 h-3' />
                Secondary Color
              </FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    className='w-full justify-start gap-2 h-8'
                    disabled={!canEdit}
                  >
                    <div
                      className='w-4 h-4 rounded border'
                      style={{ backgroundColor: settings.secondaryColor }}
                    />
                    {settings.secondaryColor}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-64 p-3' align='start'>
                  <ColorPicker
                    value={settings.secondaryColor}
                    onChange={(rgba: RgbaValue) => {
                      const r = Math.round(rgba[0])
                      const g = Math.round(rgba[1])
                      const b = Math.round(rgba[2])
                      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                      setSettings({ ...settings, secondaryColor: hex })
                    }}
                    className='flex flex-col gap-2'
                  >
                    <ColorPickerSelection className='h-40 rounded-md' />
                    <ColorPickerHue />
                    <ColorPickerAlpha />
                    <div className='flex items-center gap-2'>
                      <ColorPickerOutput />
                      <ColorPickerFormat />
                    </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor='receiptFormat'>
              Receipt Number Format
            </FieldLabel>
            <div className='relative'>
              <Input
                id='receiptFormat'
                value={settings.receiptNumberFormat}
                onChange={(e) => handleReceiptFormatChange(e.target.value)}
                placeholder='RCP-{eventCode}-{initials}{seq}'
                readOnly={!canEdit}
                className='peer ps-7'
              />
              <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <Hash size={12} />
              </div>
            </div>

            {canEdit && (
              <div className='mt-3 space-y-2'>
                <div className='text-xs font-medium text-muted-foreground'>
                  Drag to reorder, or add placeholders:
                </div>

                <div className='rounded-md border bg-muted/20 p-2'>
                  <p className='text-2xs text-muted-foreground mb-1'>
                    Examples
                  </p>
                  <div className='space-y-1'>
                    {exampleRows.map((example, index) => (
                      <p key={index} className='text-xs font-mono break-all'>
                        {renderFormatExample(
                          settings.receiptNumberFormat,
                          example
                        )}
                      </p>
                    ))}
                  </div>
                </div>

                <Reorder.Group
                  axis='x'
                  values={formatTokens}
                  onReorder={handleReorder}
                  className='flex flex-nowrap items-start gap-1.5 min-h-10 p-2 bg-muted/30 rounded-md border border-dashed overflow-x-auto no-scrollbar'
                >
                  {formatTokens.map((token) => (
                    <Reorder.Item
                      key={token.id}
                      value={token}
                      className='cursor-grab active:cursor-grabbing shrink-0'
                    >
                      {token.type === 'placeholder' ? (
                        <motion.div
                          className='inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20'
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          whileDrag={{ zIndex: 20 }}
                        >
                          <GripVertical className='w-3 h-3 opacity-50' />
                          <span>{token.label}</span>
                          <button
                            type='button'
                            onClick={() => removeToken(token.id)}
                            className='ml-1 hover:bg-primary/20 rounded p-0.5'
                          >
                            <X className='w-3 h-3' />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          className='inline-flex items-center gap-1 bg-background text-xs rounded-md border'
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          whileDrag={{ zIndex: 20 }}
                        >
                          <GripVertical className='w-3 h-3 opacity-50 ml-1' />
                          <input
                            type='text'
                            value={token.value}
                            onChange={(e) =>
                              updateTokenValue(token.id, e.target.value)
                            }
                            className='w-auto min-w-8 max-w-24 px-1 py-1 bg-transparent outline-none text-center'
                            placeholder='...'
                          />
                          <button
                            type='button'
                            onClick={() => removeToken(token.id)}
                            className='hover:bg-muted rounded p-0.5 mr-0.5'
                          >
                            <X className='w-3 h-3' />
                          </button>
                        </motion.div>
                      )}
                    </Reorder.Item>
                  ))}
                </Reorder.Group>

                <div className='flex flex-wrap gap-1.5'>
                  {PLACEHOLDER_TOKENS.map((token) => (
                    <button
                      key={token.value}
                      type='button'
                      onClick={() => addToken(token)}
                      className='inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md border transition-colors'
                    >
                      <Plus className='w-3 h-3' />
                      {token.label}
                    </button>
                  ))}
                  <button
                    type='button'
                    onClick={addStaticText}
                    className='inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md border transition-colors'
                  >
                    <Plus className='w-3 h-3' />
                    Text
                  </button>
                </div>
              </div>
            )}
          </Field>
        </CredenzaBody>

        <CredenzaFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canEdit && (
            <Button onClick={() => void saveSettings()} disabled={loading}>
              {loading && <Loader2Icon className='h-4 w-4 animate-spin mr-2' />}
              {isSuperadminMode ? 'Save as Superadmin' : 'Save Changes'}
            </Button>
          )}
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  )
}
