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

interface BookingConfirmationProps {
  name?: string
  appointmentType?: string
  date?: string
  time?: string
  location?: string
}

const BookingConfirmationEmail = ({
  name,
  appointmentType,
  date,
  time,
  location,
}: BookingConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {appointmentType || 'appointment'} is confirmed!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="KSOM360" width="80" height="80" style={logo} />
        <Heading style={h1}>Booking Confirmed ✅</Heading>
        <Text style={text}>
          {name ? `Hey ${name}, your` : 'Your'} session has been booked!
        </Text>
        <Section style={detailsBox}>
          {appointmentType && (
            <Text style={detailRow}><strong>Type:</strong> {appointmentType}</Text>
          )}
          {date && (
            <Text style={detailRow}><strong>Date:</strong> {date}</Text>
          )}
          {time && (
            <Text style={detailRow}><strong>Time:</strong> {time}</Text>
          )}
          {location && (
            <Text style={detailRow}><strong>Location:</strong> {location}</Text>
          )}
        </Section>
        <Text style={text}>
          Need to reschedule? Open the KSOM360 app and visit your Appointments.
        </Text>
        <Text style={footer}>— KSOM360</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Your ${data.appointmentType || 'appointment'} is confirmed!`,
  displayName: 'Booking confirmation',
  previewData: {
    name: 'Jordan',
    appointmentType: '1-on-1 Training',
    date: 'Tuesday, Jan 21',
    time: '10:00 AM',
    location: 'KSOM Performance Center',
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
