/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://eexxmfuknqttujecbcho.supabase.co/storage/v1/object/public/email-assets/logo.png'

interface AdminNotificationProps {
  subject?: string
  bodyHtml?: string
}

const AdminNotificationEmail = ({ subject, bodyHtml }: AdminNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject || 'You have a new notification from KSOM-360'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="KSOM-360" width="80" height="80" style={logo} />
        <Heading style={h1}>{subject || 'Notification'}</Heading>
        {bodyHtml ? (
          <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        ) : (
          <Text style={text}>You have a new notification from your coach.</Text>
        )}
        <Text style={footer}>© {new Date().getFullYear()} KSOM-360. All rights reserved.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminNotificationEmail,
  subject: (data: Record<string, any>) => data.subject || 'Notification from KSOM-360',
  displayName: 'Admin notification',
  previewData: { subject: 'Important Update', bodyHtml: '<p>This is a notification from your coach.</p>' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const logo = { margin: '0 auto 20px', display: 'block' as const }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e1e1e', margin: '0 0 20px', textAlign: 'center' as const, fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }
