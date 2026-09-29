import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface GiftReceiptEmailProps {
  donorName?: string
  tierName?: string
  giftLabel?: string
  /** 'C' means the gift was sent to the mission instead — no goods provided. */
  slot?: string
  /** Fair market value in dollars, captured at selection time. */
  fmv?: number
}

export const GiftReceiptEmail = ({
  donorName = 'Friend',
  tierName = 'Sender',
  giftLabel = 'your thank-you gift',
  slot = 'A',
  fmv = 0,
}: GiftReceiptEmailProps) => {
  const mission = slot === 'C'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {mission
          ? 'Your gift is going to the mission — receipt inside'
          : `Your ${giftLabel} is on its way — receipt inside`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Thank you, {donorName}</Heading>
          {mission ? (
            <>
              <Text style={text}>
                You chose to send your {tierName} thank-you gift to the mission instead. A candle
                has been lit in your name on the public wall.
              </Text>
              <Text style={text}>
                <strong>Tax receipt:</strong> No goods or services were provided in exchange for
                your gift. Please keep this email for your records.
              </Text>
            </>
          ) : (
            <>
              <Text style={text}>
                Your thank-you gift — <strong>{giftLabel}</strong> — has been recorded and will be
                prepared for you.
              </Text>
              <Hr style={hr} />
              <Text style={text}>
                <strong>Tax acknowledgment</strong>
              </Text>
              <Text style={text}>
                Fair market value of the item: <strong>${fmv.toFixed(2)}</strong>
              </Text>
              <Text style={text}>
                Only the portion of your gift that exceeds this fair market value is tax
                deductible. Please keep this email for your records.
              </Text>
            </>
          )}
          <Text style={footer}>
            Witness · Giving never changes how your prayers are seen.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: GiftReceiptEmail,
  subject: (d: Record<string, any>) =>
    d.slot === 'C' ? 'Your gift is lighting the way — receipt' : 'Your thank-you gift — receipt',
  displayName: 'Gift receipt (FMV / no-goods acknowledgment)',
  previewData: { donorName: 'Jordan', tierName: 'Builder', giftLabel: 'Gift A', slot: 'A', fmv: 12 },
}

export default GiftReceiptEmail

const main = { backgroundColor: '#faf8f3', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', backgroundColor: '#ffffff', borderRadius: '12px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1b2a4a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#3f4654', lineHeight: '1.6', margin: '0 0 18px' }
const hr = { borderColor: '#e6e1d4', margin: '18px 0' }
const footer = { fontSize: '12px', color: '#9a958a', margin: '28px 0 0' }
