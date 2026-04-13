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

interface WelcomeGettingStartedProps {
  name?: string
  loginUrl?: string
}

const WelcomeGettingStartedEmail = ({ name, loginUrl }: WelcomeGettingStartedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Here's how to get started with KSOM-360</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="KSOM-360" width="80" height="80" style={logo} />
        <Heading style={h1}>Let's Get Started! 🚀</Heading>
        <Text style={text}>
          {name ? `Hey ${name}, welcome` : 'Welcome'} to KSOM-360! Here's a quick guide to help you hit the ground running:
        </Text>
        <Section style={stepsBox}>
          <Text style={stepItem}>
            <strong>Step 1:</strong> Log in and explore your dashboard — it's your home base for everything.
          </Text>
          <Text style={stepItem}>
            <strong>Step 2:</strong> Check out your assigned workouts and meal plans.
          </Text>
          <Text style={stepItem}>
            <strong>Step 3:</strong> Log your first check-in — track your weight, sleep, and how you're feeling.
          </Text>
          <Text style={stepItem}>
            <strong>Step 4:</strong> Message your coach if you have any questions!
          </Text>
        </Section>
        {loginUrl && (
          <Button style={button} href={loginUrl}>
            Open Your Dashboard
          </Button>
        )}
        <Text style={footer}>— The KSOM-360 Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeGettingStartedEmail,
  subject: 'Here\'s How to Get Started with KSOM-360 🚀',
  displayName: 'Welcome - Getting started',
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
const stepsBox = {
  backgroundColor: '#f8f8f8',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 24px',
  borderLeft: '4px solid #CC1A1A',
}
const stepItem = { fontSize: '14px', color: '#333333', lineHeight: '1.8', margin: '0 0 8px' }
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
