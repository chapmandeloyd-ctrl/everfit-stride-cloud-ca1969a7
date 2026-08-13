/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
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

interface Props {
  name?: string
  dayNumber?: number
  plannedDays?: number
  modeLabel?: string
  appUrl?: string
}

const JuiceLogReminderEmail = ({
  name,
  dayNumber,
  plannedDays,
  modeLabel,
  appUrl = 'https://apexbeast-if.app/client/dashboard',
}: Props) => {
  const dayLabel = dayNumber && plannedDays ? `Day ${dayNumber} of ${plannedDays}` : 'Today'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{dayLabel} — log your juice day</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt="APEXBEAST-IF" width="80" height="80" style={logo} />
          <Heading style={h1}>Log your juice day</Heading>
          <Text style={text}>
            {name ? `Hey ${name},` : 'Hey,'} you haven't logged today yet. It takes about twenty seconds
            and keeps your juice fast history accurate.
          </Text>
          <Section style={detailsBox}>
            <Text style={detailRow}><strong>{dayLabel}</strong></Text>
            {modeLabel ? <Text style={detailRow}>Mode: {modeLabel}</Text> : null}
            <Text style={detailRow}>Log juices, water, energy and any snacks.</Text>
          </Section>
          <Button href={appUrl} style={button}>Log today</Button>
          <Text style={footer}>— APEXBEAST-IF</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: JuiceLogReminderEmail,
  subject: (data: Record<string, any>) =>
    data.dayNumber && data.plannedDays
      ? `Log day ${data.dayNumber} of ${data.plannedDays} of your juice fast`
      : 'Log your juice day',
  displayName: 'Juice log reminder',
  previewData: {
    name: 'Jordan',
    dayNumber: 2,
    plannedDays: 5,
    modeLabel: 'Juice Only',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 auto 20px', display: 'block' as const, backgroundColor: '#000000', padding: '18px', borderRadius: '18px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f1f1f', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const detailsBox = {
  backgroundColor: '#f8f8f8',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 20px',
  borderLeft: '4px solid #10b981',
}
const detailRow = { fontSize: '14px', color: '#333333', lineHeight: '1.8', margin: '0' }
const button = {
  backgroundColor: '#CC1A1A',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'block' as const,
  textAlign: 'center' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }
