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

interface WelcomeMeetCoachProps {
  name?: string
  coachName?: string
  coachMessage?: string
  loginUrl?: string
}

const WelcomeMeetCoachEmail = ({ name, coachName, coachMessage, loginUrl }: WelcomeMeetCoachProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{coachName ? `${coachName} welcomes you to KSOM-360` : 'Your coach welcomes you!'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="KSOM-360" width="80" height="80" style={logo} />
        <Heading style={h1}>Meet Your Coach 🤝</Heading>
        <Text style={text}>
          {name ? `Hey ${name}!` : 'Hey!'} {coachName ? `I'm ${coachName}, your coach on KSOM-360.` : 'Your coach is excited to work with you!'}
        </Text>
        {coachMessage ? (
          <Text style={quoteBox}>"{coachMessage}"</Text>
        ) : (
          <Text style={quoteBox}>
            "I'm excited to work with you! Together we'll build a plan that fits your life, push through plateaus, and celebrate every win along the way. Let's do this!"
          </Text>
        )}
        <Text style={text}>
          Have a question? You can message {coachName || 'your coach'} anytime through the app. Don't be shy — that's what I'm here for!
        </Text>
        {loginUrl && (
          <Button style={button} href={loginUrl}>
            Say Hello 👋
          </Button>
        )}
        <Text style={footer}>— {coachName || 'Your Coach'} & The KSOM-360 Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeMeetCoachEmail,
  subject: (data: Record<string, any>) =>
    data.coachName ? `${data.coachName} welcomes you to KSOM-360!` : 'Your Coach Welcomes You to KSOM-360!',
  displayName: 'Welcome - Meet your coach',
  previewData: {
    name: 'Jordan',
    coachName: 'Coach Mike',
    loginUrl: 'https://ksom-360.app/auth',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 auto 20px', display: 'block' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f1f1f', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const quoteBox = {
  fontSize: '15px',
  color: '#1f1f1f',
  lineHeight: '1.6',
  margin: '0 0 20px',
  backgroundColor: '#f8f8f8',
  borderRadius: '12px',
  padding: '16px 20px',
  borderLeft: '4px solid #CC1A1A',
  fontStyle: 'italic' as const,
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
