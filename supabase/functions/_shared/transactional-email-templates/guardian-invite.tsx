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
  Text,
} from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://eexxmfuknqttujecbcho.supabase.co/storage/v1/object/public/email-assets/logo.png'

interface GuardianInviteProps {
  athleteName?: string
  viewUrl?: string
}

const GuardianInviteEmail = ({ athleteName, viewUrl }: GuardianInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Weekly recovery summary access</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="APEXBEAST-IF" width="80" height="80" style={logo} />
        <Heading style={h1}>Weekly Recovery Summary</Heading>
        <Text style={text}>Hello,</Text>
        <Text style={text}>
          You've been invited by {athleteName || 'your athlete'}'s coach to view their
          weekly recovery summary — training readiness, sleep quality, and recovery habits.
        </Text>
        <Text style={text}>This is a read-only view. No account is required.</Text>
        {viewUrl ? (
          <Button style={button} href={viewUrl}>
            View Recovery Summary
          </Button>
        ) : null}
        <Text style={small}>
          This link expires in 7 days. If you need continued access, contact the coach.
        </Text>
        <Text style={footer}>
          This summary contains aggregated wellness data only — no detailed workout logs,
          nutrition data, or private notes. If you didn't expect this email, disregard it.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GuardianInviteEmail,
  subject: (data: Record<string, any>) =>
    `APEXBEAST-IF — Weekly Recovery Summary${data?.athleteName ? ` for ${data.athleteName}` : ''}`,
  displayName: 'Guardian recovery summary invite',
  previewData: { athleteName: 'Jordan', viewUrl: 'https://apexbeast-if.app/guardian/example-token' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 auto 20px', display: 'block' as const, backgroundColor: '#000000', padding: '18px', borderRadius: '18px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f1f1f', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: '#CC1A1A', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'block' as const, textAlign: 'center' as const, width: '100%' }
const small = { fontSize: '13px', color: '#888888', lineHeight: '1.5', margin: '20px 0 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0', textAlign: 'center' as const }