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

type Slot = 'night_before' | 't_minus_60' | 't_minus_15'

interface Props {
  name?: string
  slot?: Slot
  startLabel?: string        // "Sun · 8:00 PM"
  fastHours?: number         // 16
  protocolLabel?: string     // "16:8 Lean Gains"
}

const HEADLINES: Record<Slot, string> = {
  night_before: 'Your fast starts tomorrow',
  t_minus_60: 'Your fast starts in 1 hour',
  t_minus_15: 'Your fast starts in 15 minutes',
}

const PreFastReminderEmail = ({
  name,
  slot = 'night_before',
  startLabel,
  fastHours,
  protocolLabel,
}: Props) => {
  const headline = HEADLINES[slot]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{headline}{startLabel ? ` — ${startLabel}` : ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt="KSOM-360" width="80" height="80" style={logo} />
          <Heading style={h1}>{headline}</Heading>
          <Text style={text}>
            {name ? `Hey ${name},` : 'Hey,'} heads up — your next scheduled fast is coming up.
          </Text>
          <Section style={detailsBox}>
            {protocolLabel ? <Text style={detailRow}><strong>{protocolLabel}</strong></Text> : null}
            {startLabel ? <Text style={detailRow}>Starts: {startLabel}</Text> : null}
            {fastHours ? <Text style={detailRow}>Target: {fastHours}h fast</Text> : null}
          </Section>
          <Text style={text}>
            Your fast will <strong>auto-start</strong> at the scheduled time. You'll get a 5-minute grace window in the app to cancel if plans change.
          </Text>
          <Text style={footer}>— KSOM-360</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PreFastReminderEmail,
  subject: (data: Record<string, any>) => {
    const slot = (data.slot as Slot) || 'night_before'
    if (slot === 't_minus_15') return 'Your fast starts in 15 minutes'
    if (slot === 't_minus_60') return 'Your fast starts in 1 hour'
    return `Your fast starts tomorrow${data.startLabel ? ` — ${data.startLabel}` : ''}`
  },
  displayName: 'Pre-fast reminder',
  previewData: {
    name: 'Jordan',
    slot: 't_minus_60',
    startLabel: 'Sun · 8:00 PM',
    fastHours: 16,
    protocolLabel: '16:8 Lean Gains',
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