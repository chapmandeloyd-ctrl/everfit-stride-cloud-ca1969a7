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

interface ClientInvitationProps {
  name?: string
  trainerName?: string
  loginUrl?: string
  tempPassword?: string
}

const ClientInvitationEmail = ({
  name,
  trainerName,
  loginUrl,
  tempPassword,
}: ClientInvitationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {trainerName
        ? `${trainerName} invited you to KSOM-360`
        : 'You\'ve been invited to KSOM-360'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="KSOM-360" width="80" height="80" style={logo} />
        <Heading style={h1}>You're in! 🎉</Heading>
        <Text style={text}>
          {name ? `Hey ${name}, ` : ''}
          {trainerName
            ? `${trainerName} has set up your KSOM-360 account.`
            : 'Your KSOM-360 account is ready.'}
          {' '}Log in to access your personalized training, nutrition, and progress tracking.
        </Text>
        {tempPassword && (
          <Text style={credentialsText}>
            Your temporary password: <strong>{tempPassword}</strong>
          </Text>
        )}
        {loginUrl && (
          <Button style={button} href={loginUrl}>
            Log In to KSOM-360
          </Button>
        )}
        <Text style={footer}>— The KSOM-360 Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ClientInvitationEmail,
  subject: (data: Record<string, any>) =>
    data.trainerName
      ? `${data.trainerName} invited you to KSOM-360`
      : 'You\'ve been invited to KSOM-360',
  displayName: 'Client invitation',
  previewData: {
    name: 'Jordan',
    trainerName: 'Coach Mike',
    loginUrl: 'https://everfit-stride-cloud.lovable.app/auth',
    tempPassword: 'Temp1234!',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 auto 20px', display: 'block' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f1f1f', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const credentialsText = {
  fontSize: '15px',
  color: '#1f1f1f',
  lineHeight: '1.6',
  margin: '0 0 20px',
  backgroundColor: '#f8f8f8',
  borderRadius: '8px',
  padding: '12px 16px',
  textAlign: 'center' as const,
}
const button = {
  backgroundColor: '#CC1A1A',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'block' as const,
  textAlign: 'center' as const,
  width: '100%',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }
