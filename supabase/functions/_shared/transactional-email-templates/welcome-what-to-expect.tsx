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

interface WelcomeWhatToExpectProps {
  name?: string
  loginUrl?: string
}

const WelcomeWhatToExpectEmail = ({ name, loginUrl }: WelcomeWhatToExpectProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Here's what you get with KSOM-360</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="KSOM-360" width="80" height="80" style={logo} />
        <Heading style={h1}>What to Expect 🎯</Heading>
        <Text style={text}>
          {name ? `${name}, here's` : 'Here\'s'} what you can look forward to with KSOM-360:
        </Text>
        <Section style={featureBox}>
          <Text style={featureItem}>🏋️ <strong>Custom Workouts</strong> — Personalized training plans built just for you</Text>
          <Text style={featureItem}>🥗 <strong>Meal Plans & Nutrition</strong> — Balanced meal plans with macro tracking</Text>
          <Text style={featureItem}>📊 <strong>Progress Tracking</strong> — See your gains with detailed charts and metrics</Text>
          <Text style={featureItem}>💬 <strong>Coach Messaging</strong> — Direct access to your coach anytime</Text>
          <Text style={featureItem}>📸 <strong>Progress Photos</strong> — Visual timeline of your transformation</Text>
          <Text style={featureItem}>🏆 <strong>Goals & Badges</strong> — Set targets and earn achievements</Text>
        </Section>
        <Text style={text}>
          Everything is designed to keep you motivated, accountable, and on track. Your coach has your back every step of the way!
        </Text>
        {loginUrl && (
          <Button style={button} href={loginUrl}>
            Explore KSOM-360
          </Button>
        )}
        <Text style={footer}>— The KSOM-360 Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeWhatToExpectEmail,
  subject: 'Here\'s What to Expect with KSOM-360 🎯',
  displayName: 'Welcome - What to expect',
  previewData: {
    name: 'Jordan',
    loginUrl: 'https://ksom-360.app/auth',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 auto 20px', display: 'block' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f1f1f', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const featureBox = {
  backgroundColor: '#f8f8f8',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 24px',
}
const featureItem = { fontSize: '14px', color: '#333333', lineHeight: '1.8', margin: '0 0 6px' }
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
