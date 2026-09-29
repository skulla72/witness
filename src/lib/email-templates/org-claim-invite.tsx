import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface OrgClaimInviteProps {
  /** The church, ministry or nonprofit being invited. */
  orgName?: string
  /** Where they can take responsibility for the page. */
  claimUrl?: string
  /** Where the page already lives, so they can look before deciding. */
  pageUrl?: string
}

/**
 * Someone in the app said this church or nonprofit is theirs. This letter tells
 * the organization their page exists and offers it to them — no pressure, no
 * charge to claim it.
 */
export const OrgClaimInviteEmail = ({
  orgName = 'your organization',
  claimUrl = 'https://witnessmovement.com',
  pageUrl = 'https://witnessmovement.com',
}: OrgClaimInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Someone named {orgName} as their church home on Witness</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Someone named you as their people</Heading>
        <Text style={text}>
          A person using Witness added <strong>{orgName}</strong> as their church, ministry or
          nonprofit. There's already a page for you there, and it's yours to take over whenever
          you'd like.
        </Text>
        <Text style={text}>
          Witness is a place where people share a prayer they need, and later share the answer.
          Claiming your page lets you post what you gather for, ask for help your people can
          actually see, and receive gifts if you choose to.
        </Text>
        <Button style={button} href={claimUrl}>
          Claim your page
        </Button>
        <Text style={text}>
          You can look at it first: <a href={pageUrl} style={link}>{pageUrl}</a>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Claiming a page is free. If this isn't for you, ignore this note and nothing changes —
          or reply and we'll take the page down.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default OrgClaimInviteEmail

const main = { backgroundColor: '#faf8f3', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 26px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0b1729',
  margin: '0 0 18px',
}
const text = {
  fontSize: '14.5px',
  color: '#3c4557',
  lineHeight: '1.6',
  margin: '0 0 18px',
}
const link = { color: '#0b1729' }
const button = {
  backgroundColor: '#0b1729',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '10px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e6e1d6', margin: '26px 0 14px' }
const footer = { fontSize: '12px', color: '#8a8578', lineHeight: '1.5', margin: 0 }

export const template = {
  component: OrgClaimInviteEmail,
  subject: (data: Record<string, any>) =>
    `Someone named ${data['orgName'] ?? 'your organization'} as their people on Witness`,
  displayName: 'Claim your page invitation',
  previewData: {
    orgName: 'Grace Chapel',
    claimUrl: 'https://witnessmovement.com/community/claim/grace-chapel',
    pageUrl: 'https://witnessmovement.com/community/grace-chapel',
  },
}
