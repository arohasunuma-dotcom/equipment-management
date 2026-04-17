const SLACK_API_BASE = 'https://slack.com/api'

function getToken(): string {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not set')
  }
  return token
}

export async function sendSlackMessage(text: string, channel?: string): Promise<void> {
  const channelId = channel ?? process.env.SLACK_CHANNEL_ID
  if (!channelId) {
    console.error('[slack] sendSlackMessage: channel not specified and SLACK_CHANNEL_ID is not set')
    return
  }

  try {
    const token = getToken()
    const res = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel: channelId, text }),
    })

    const json = await res.json() as { ok: boolean; error?: string }
    if (!json.ok) {
      console.error('[slack] chat.postMessage failed:', json.error)
    }
  } catch (err) {
    console.error('[slack] sendSlackMessage error:', err)
  }
}

export async function sendSlackDM(slackUserId: string, text: string): Promise<void> {
  try {
    const token = getToken()

    const openRes = await fetch(`${SLACK_API_BASE}/conversations.open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ users: slackUserId }),
    })

    const openJson = await openRes.json() as { ok: boolean; channel?: { id: string }; error?: string }
    if (!openJson.ok || !openJson.channel?.id) {
      console.error('[slack] conversations.open failed:', openJson.error)
      return
    }

    const dmChannel = openJson.channel.id
    const msgRes = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel: dmChannel, text }),
    })

    const msgJson = await msgRes.json() as { ok: boolean; error?: string }
    if (!msgJson.ok) {
      console.error('[slack] chat.postMessage (DM) failed:', msgJson.error)
    }
  } catch (err) {
    console.error('[slack] sendSlackDM error:', err)
  }
}
