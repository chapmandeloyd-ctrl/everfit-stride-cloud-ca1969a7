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

interface ClientWelcomeProps {
  fullName?: string
  email?: string
  loginLink?: string
}

const ClientWelcomeEmail = ({ fullName, email, loginLink }: ClientWelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your APEXBEAST-IF account is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="APEXBEAST-IF" width="80" height="80" style={logo} />
        <Heading style={h1}>Welcome to APEXBEAST-IF!</Heading>
        <Text style={text}>{fullName ? `Hi ${fullName},` : 'Hi there,'}</Text>
        <Text style={text}>
          Your coach has created an account for you. You can now access your
          personalized dashboard, track your progress, and view your plan.
        </Text>
        <Section style={infoBox}>
          <Text style={infoLabel}>Your login email</Text>
          <Text style={infoValue}>{email || 'your email address'}</Text>
          <Text style={infoNote}>
            If you haven't set a password yet, use "Forgot password" on the sign-in
            page to create one.
          </Text>
        </Section>
        <Button style={button} href={loginLink || 'https://apexbeast-if.app/auth'}>
          Sign in to your account
        </Button>
        <Text style={footer}>
          Questions? Reach out to your coach any time.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ClientWelcomeEmail,
  subject: 'Welcome to APEXBEAST-IF — your account is ready',
  displayName: 'Client account welcome',
  previewData: { fullName: 'Jordan', email: 'jordan@example.com', loginLink: 'https://apexbeast-if.app/auth' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 auto 20px', display: 'block' as const, backgroundColor: '#000000', padding: '18px', borderRadius: '18px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f1f1f', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const infoBox = { backgroundColor: '#f7f7f7', borderLeft: '4px solid #CC1A1A', borderRadius: '10px', padding: '16px 18px', margin: '0 0 24px' }
const infoLabel = { fontSize: '12px', color: '#888888', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const infoValue = { fontSize: '15px', color: '#1f1f1f', fontWeight: '600' as const, margin: '0 0 12px' }
const infoNote = { fontSize: '13px', color: '#777777', lineHeight: '1.5', margin: '0' }
const button = { backgroundColor: '#CC1A1A', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'block' as const, textAlign: 'center' as const, width: '100%' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }