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

interface ProtocolReminderProps {
  name?: string
  eventLabel?: string
  dueLabel?: string
  hoursUntil?: number
  audience?: 'client' | 'trainer'
  clientName?: string
}

const ProtocolReminderEmail = ({
  name,
  eventLabel,
  dueLabel,
  hoursUntil,
  audience,
  clientName,
}: ProtocolReminderProps) => {
  const isTrainer = audience === 'trainer'
  const headline = hoursUntil && hoursUntil <= 30 ? 'Due tomorrow ⏰' : 'Coming up in 2 days 📅'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{eventLabel || 'Protocol check-in'} — {dueLabel}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt="APEX360-IF" width="80" height="80" style={logo} />
          <Heading style={h1}>{headline}</Heading>
          <Text style={text}>
            {isTrainer
              ? `Heads up${name ? ` ${name}` : ''} — ${clientName || 'your client'} has an upcoming item you should track:`
              : `${name ? `Hey ${name}, ` : ''}just a reminder — you have an upcoming item on your protocol:`}
          </Text>
          <Section style={detailsBox}>
            <Text style={detailRow}><strong>{eventLabel || 'Protocol event'}</strong></Text>
            <Text style={detailRow}>{dueLabel}</Text>
          </Section>
          <Text style={text}>
            {isTrainer
              ? 'Give them a nudge or review their plan ahead of the deadline.'
              : 'Get ready — log your check-in on time to keep your streak going. 💪'}
          </Text>
          <Text style={footer}>— APEX360-IF</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProtocolReminderEmail,
  subject: (data: Record<string, any>) => {
    const when = data.hoursUntil && data.hoursUntil <= 30 ? 'tomorrow' : 'in 2 days'
    return `${data.eventLabel || 'Protocol check-in'} — ${when}`
  },
  displayName: 'Protocol reminder',
  previewData: {
    name: 'Jordan',
    eventLabel: 'Weekly check-in',
    dueLabel: 'Wednesday, Jan 22 at 9:00 AM',
    hoursUntil: 24,
    audience: 'client',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 auto 20px', display: 'block' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f1f1f', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const detailsBox = {
  backgroundColor: '#f8f8f8',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 20px',
  borderLeft: '4px solid #CC1A1A',
}
const detailRow = { fontSize: '14px', color: '#333333', lineHeight: '1.8', margin: '0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }