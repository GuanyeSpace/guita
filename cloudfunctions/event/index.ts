import cloud from 'wx-server-sdk'

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV as unknown as string,
})

const db = cloud.database()

interface CloudFunctionEvent {
  action: string
  payload?: Record<string, unknown>
}

async function handleTrack(payload?: Record<string, unknown>) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 40001, message: '获取用户信息失败', data: null }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { code: 40011, message: '用户不存在，请重新登录', data: null }
  }

  const user = userRes.data[0] as Record<string, unknown>

  const event_name = payload?.event_name as string | undefined
  if (!event_name || typeof event_name !== 'string' || event_name.trim() === '') {
    return { code: 40040, message: '事件名不合法', data: null }
  }

  const host_id = (payload?.host_id as string | null) ?? null
  const content_id = (payload?.content_id as string | null) ?? null
  const properties = (payload?.properties as Record<string, unknown>) ?? {}

  await db.collection('events').add({
    data: {
      guita_id: user.guita_id,
      user_id: user._id,
      event_name,
      host_id,
      content_id,
      properties,
      occurred_at: new Date(),
    },
  })

  return {
    code: 0,
    message: 'ok',
    data: { tracked: true },
  }
}

exports.main = async (event: CloudFunctionEvent) => {
  const { action, payload } = event

  try {
    switch (action) {
      case 'track':
        return await handleTrack(payload)
      default:
        return { code: 40004, message: `未知操作: ${action}`, data: null }
    }
  } catch (e: any) {
    console.error('event error:', e)
    return { code: 50000, message: '服务器内部错误', data: null }
  }
}
