export interface CalendarEventItem {
  id: string
  summary: string
  start: string
  end: string
}

// Base64url encode (no padding)
function base64url(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data)
  let str = ''
  for (const b of bytes) {
    str += String.fromCharCode(b)
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function encodeJson(obj: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(obj)).buffer as ArrayBuffer)
}

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_CALENDAR_PRIVATE_KEY

  if (!clientEmail || !privateKeyRaw) {
    throw new Error('Google Calendar credentials are not set')
  }

  // Replace escaped newlines from env var
  const privateKeyPem = privateKeyRaw.replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const header = encodeJson({ alg: 'RS256', typ: 'JWT' })
  const payload = encodeJson({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })

  const signingInput = `${header}.${payload}`

  // Import private key (PKCS8 PEM)
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const pkcs8Der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  )

  const jwt = `${signingInput}.${base64url(signature)}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenJson = await tokenRes.json() as { access_token?: string; error?: string }
  if (!tokenJson.access_token) {
    throw new Error(`Failed to get access token: ${tokenJson.error ?? 'unknown error'}`)
  }

  return tokenJson.access_token
}

export async function fetchCalendarEvents(
  startDate: string,
  endDate: string,
): Promise<CalendarEventItem[]> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId) {
    console.error('[googleCalendar] GOOGLE_CALENDAR_ID is not set')
    return []
  }

  try {
    const accessToken = await getAccessToken()

    const params = new URLSearchParams({
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: 'true',
      orderBy: 'startTime',
    })

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    )

    if (!res.ok) {
      console.error('[googleCalendar] fetchCalendarEvents HTTP error:', res.status)
      return []
    }

    type RawEvent = {
      id?: string
      summary?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
    }

    const json = await res.json() as { items?: RawEvent[] }
    const items = json.items ?? []

    return items
      .filter((item): item is RawEvent & { id: string; summary: string } =>
        Boolean(item.id && item.summary),
      )
      .map((item) => ({
        id: item.id,
        summary: item.summary,
        start: item.start?.dateTime ?? item.start?.date ?? '',
        end: item.end?.dateTime ?? item.end?.date ?? '',
      }))
  } catch (err) {
    console.error('[googleCalendar] fetchCalendarEvents error:', err)
    return []
  }
}
