'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { SettingsIcon, Building2Icon, Loader2Icon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { RgbaValue } from '@/components/kibo-ui/color-picker'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerFormat,
} from '@/components/kibo-ui/color-picker'

interface OrganizationSettings {
  name: string
  description: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  receiptNumberFormat: string
}

function rgbaToHex(rgba: RgbaValue): string {
  const [r, g, b] = rgba
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`
}

export function OrganizationSettingsDropdown() {
  const { currentOrganization } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<OrganizationSettings>({
    name: '',
    description: '',
    logoUrl: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    receiptNumberFormat: 'RCP-{eventCode}-{initials}{seq}',
  })

  const isAdmin = currentOrganization?.role === 'admin'

  if (!currentOrganization) return null

  const openSettings = async () => {
    setSettingsOpen(true)
    try {
      const res = await fetch(`/api/organizations/${currentOrganization.slug}`)
      if (res.ok) {
        const data = await res.json()
        setSettings({
          name: data.name || '',
          description: data.description || '',
          logoUrl: data.logoUrl || '',
          primaryColor: data.settings?.primaryColor || '#3b82f6',
          secondaryColor: data.settings?.secondaryColor || '#1e40af',
          receiptNumberFormat:
            data.settings?.receiptNumberFormat ||
            'RCP-{eventCode}-{initials}{seq}',
        })
      }
    } catch {
      toast.error('Failed to load settings')
    }
  }

  const saveSettings = async () => {
    if (!isAdmin) {
      toast.error('Only admins can update organization settings')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/organizations/${currentOrganization.slug}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: settings.name,
            description: settings.description,
            logoUrl: settings.logoUrl,
            settings: {
              primaryColor: settings.primaryColor,
              secondaryColor: settings.secondaryColor,
              receiptNumberFormat: settings.receiptNumberFormat,
            },
          }),
        }
      )

      if (res.ok) {
        toast.success('Settings updated')
        setSettingsOpen(false)
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

  return (
    <>
      <DropdownMenuItem
        className='cursor-pointer'
        onClick={() => void openSettings()}
        disabled={!isAdmin}
      >
        <SettingsIcon className='h-4 w-4' />
        Organization Settings
      </DropdownMenuItem>

      <Credenza open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CredenzaContent className='sm:max-w-lg'>
          <CredenzaHeader>
            <CredenzaTitle className='flex items-center gap-2'>
              <Building2Icon className='h-4 w-4' />
              Organization Settings
            </CredenzaTitle>
            <CredenzaDescription>
              Manage your organization's appearance and settings.
            </CredenzaDescription>
          </CredenzaHeader>

          <CredenzaBody className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Organization Name</Label>
              <Input
                id='name'
                value={settings.name}
                onChange={(e) =>
                  setSettings({ ...settings, name: e.target.value })
                }
                placeholder='ACES'
                readOnly={!isAdmin}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                value={settings.description}
                onChange={(e) =>
                  setSettings({ ...settings, description: e.target.value })
                }
                placeholder='Association of Computer Engineering Students'
                readOnly={!isAdmin}
                rows={2}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='logoUrl'>Logo URL</Label>
              <Input
                id='logoUrl'
                value={settings.logoUrl}
                onChange={(e) =>
                  setSettings({ ...settings, logoUrl: e.target.value })
                }
                placeholder='https://example.com/logo.png'
                readOnly={!isAdmin}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Primary Color</Label>
                <ColorPicker
                  value={settings.primaryColor}
                  onChange={(rgba) =>
                    setSettings({ ...settings, primaryColor: rgbaToHex(rgba) })
                  }
                >
                  <div className='h-32 w-full'>
                    <ColorPickerSelection className='rounded-t' />
                    <ColorPickerHue className='rounded-b' />
                  </div>
                  <ColorPickerFormat />
                </ColorPicker>
              </div>
              <div className='space-y-2'>
                <Label>Secondary Color</Label>
                <ColorPicker
                  value={settings.secondaryColor}
                  onChange={(rgba) =>
                    setSettings({
                      ...settings,
                      secondaryColor: rgbaToHex(rgba),
                    })
                  }
                >
                  <div className='h-32 w-full'>
                    <ColorPickerSelection className='rounded-t' />
                    <ColorPickerHue className='rounded-b' />
                  </div>
                  <ColorPickerFormat />
                </ColorPicker>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='receiptFormat'>Receipt Number Format</Label>
              <Input
                id='receiptFormat'
                value={settings.receiptNumberFormat}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    receiptNumberFormat: e.target.value,
                  })
                }
                placeholder='RCP-{eventCode}-{initials}{seq}'
                readOnly={!isAdmin}
              />
              <p className='text-xs text-muted-foreground'>
                Placeholders: {'{eventCode}'}, {'{initials}'}, {'{seq}'},{' '}
                {'{orgCode}'}, {'{year}'}, {'{yy}'}, {'{month}'}, {'{type}'}
              </p>
            </div>
          </CredenzaBody>

          <CredenzaFooter>
            <Button variant='outline' onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            {isAdmin && (
              <Button onClick={() => void saveSettings()} disabled={loading}>
                {loading && (
                  <Loader2Icon className='h-4 w-4 animate-spin mr-2' />
                )}
                Save Changes
              </Button>
            )}
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </>
  )
}
