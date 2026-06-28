import cloud from 'wx-server-sdk'

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV as unknown as string,
})

const db = cloud.database()

function normalizeFileId(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const first = value[0]
    if (typeof first === 'string') return first
    if (typeof first === 'object' && first !== null) {
      return (first as Record<string, unknown>).fileID as string
        || (first as Record<string, unknown>).fileId as string
        || (first as Record<string, unknown>).url as string
        || ''
    }
    return ''
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return obj.fileID as string || obj.fileId as string || obj.url as string || ''
  }
  return ''
}

interface CloudFunctionEvent {
  action: string
  payload?: Record<string, unknown>
}

async function handleList(payload?: Record<string, unknown>) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const contentType = payload?.content_type as string | undefined
  if (contentType !== 'live_replay' && contentType !== 'recipe') {
    return { code: 40030, message: '内容类型不正确', data: null }
  }

  // 游客模式：传入 host_id 直接查询，不依赖用户登录态
  const guestHostId = payload?.host_id as string | undefined
  if (guestHostId) {
    // 校验主播存在且为活跃状态
    try {
      const hostDoc = await db.collection('hosts').doc(guestHostId).get()
      if (!hostDoc.data || (hostDoc.data.status !== 'active')) {
        return { code: 40034, message: '主播不存在或已下架', data: null }
      }
    } catch (_) {
      return { code: 40034, message: '主播不存在或已下架', data: null }
    }

    const page = Math.max(1, (payload?.page as number) || 1)
    const pageSize = Math.min(50, Math.max(1, (payload?.page_size as number) || 20))
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {
      host_id: guestHostId,
      content_type: contentType,
      status: 'published',
    }

    const countRes = await db.collection('content_catalog').where(where).count()
    const total = countRes.total

    let query = db.collection('content_catalog').where(where)
    if (contentType === 'live_replay') {
      query = query.orderBy('published_at', 'desc')
    } else {
      query = query.orderBy('sort_order', 'asc').orderBy('published_at', 'desc')
    }

    const listRes = await query.skip(skip).limit(pageSize).get()

    const list = listRes.data.map((item: Record<string, unknown>) => ({
      ...item,
      cover_file_id: normalizeFileId(item.cover_file_id),
      asset_file_id: normalizeFileId(item.asset_file_id),
    }))

    return {
      code: 0,
      message: 'ok',
      data: { list, page, page_size: pageSize, total },
    }
  }

  // 登录模式：按用户绑定关系查询
  if (!openid) {
    return { code: 40001, message: '获取用户信息失败', data: null }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { code: 40011, message: '用户不存在，请重新登录', data: null }
  }

  const user = userRes.data[0]

  if (user.status === 'inactive' || user.status === 'banned' || user.status === 'deleted') {
    return { code: 40012, message: '当前账号暂不可用', data: null }
  }

  if (!user.phone) {
    return { code: 40020, message: '请先绑定手机号', data: null }
  }

  const bindRes = await db.collection('user_host_bindings')
    .where({ user_id: user._id, status: 'active' })
    .limit(1)
    .get()

  if (bindRes.data.length === 0) {
    return { code: 40025, message: '暂未绑定主播', data: null }
  }

  const binding = bindRes.data[0]

  const page = Math.max(1, (payload?.page as number) || 1)
  const pageSize = Math.min(50, Math.max(1, (payload?.page_size as number) || 20))
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {
    host_id: binding.host_id,
    content_type: contentType,
    status: 'published',
  }

  const countRes = await db.collection('content_catalog').where(where).count()
  const total = countRes.total

  let query = db.collection('content_catalog').where(where)

  if (contentType === 'live_replay') {
    query = query.orderBy('published_at', 'desc')
  } else {
    query = query.orderBy('sort_order', 'asc').orderBy('published_at', 'desc')
  }

  const listRes = await query.skip(skip).limit(pageSize).get()

  const list = listRes.data.map((item: Record<string, unknown>) => ({
    ...item,
    cover_file_id: normalizeFileId(item.cover_file_id),
    asset_file_id: normalizeFileId(item.asset_file_id),
  }))

  return {
    code: 0,
    message: 'ok',
    data: {
      list,
      page,
      page_size: pageSize,
      total,
    },
  }
}

async function handleRecord(payload?: Record<string, unknown>) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 40001, message: '获取用户信息失败', data: null }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { code: 40011, message: '用户不存在，请重新登录', data: null }
  }

  const user = userRes.data[0]

  if (user.status === 'inactive' || user.status === 'banned' || user.status === 'deleted') {
    return { code: 40012, message: '当前账号暂不可用', data: null }
  }

  const contentId = payload?.content_id as string | undefined
  if (!contentId) {
    return { code: 40031, message: '内容不存在', data: null }
  }

  const recordType = payload?.record_type as string | undefined
  const validTypes = ['view', 'play', 'progress', 'complete', 'preview']
  if (!recordType || !validTypes.includes(recordType)) {
    return { code: 40033, message: '记录类型不正确', data: null }
  }

  const bindRes = await db.collection('user_host_bindings')
    .where({ user_id: user._id, status: 'active' })
    .limit(1)
    .get()

  const hostId = bindRes.data.length > 0 ? bindRes.data[0].host_id : null

  const now = new Date()
  const progressSec = (payload?.progress_sec as number) || 0
  const completed = !!payload?.completed

  // 同一用户 + 同一内容 + 同一 record_type 存在则更新，否则新增
  const existingRes = await db.collection('user_content_records')
    .where({
      user_id: user._id,
      content_id: contentId,
      record_type: recordType,
    })
    .limit(1)
    .get()

  if (existingRes.data.length > 0) {
    await db.collection('user_content_records').doc(existingRes.data[0]._id).update({
      data: {
        progress_sec: Math.max(progressSec, (existingRes.data[0].progress_sec as number) || 0),
        completed: completed || existingRes.data[0].completed,
        updated_at: now,
      },
    })
  } else {
    await db.collection('user_content_records').add({
      data: {
        guita_id: user.guita_id,
        user_id: user._id,
        host_id: hostId,
        content_id: contentId,
        record_type: recordType,
        progress_sec: progressSec,
        completed,
        created_at: now,
        updated_at: now,
      },
    })
  }

  return { code: 0, message: 'ok', data: null }
}

async function handleCreate(payload?: Record<string, unknown>) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 40001, message: '获取用户信息失败', data: null }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { code: 40011, message: '用户不存在，请重新登录', data: null }
  }

  const title = payload?.title as string
  const contentType = payload?.content_type as string
  const hostId = payload?.host_id as string
  const status = (payload?.status as string) || 'draft'
  const description = (payload?.description as string) || ''
  const contentCategory = (payload?.content_category as string) || ''
  const tags = (payload?.tags as string[]) || []
  const durationSec = (payload?.duration_sec as number) || 0
  const sortOrder = (payload?.sort_order as number) || 100
  const coverFileId = (payload?.cover_file_id as string) || ''
  const assetFileId = (payload?.asset_file_id as string) || ''
  const assetUrl = (payload?.asset_url as string) || ''

  if (!title || !contentType || !hostId) {
    return { code: 40030, message: '标题、内容类型和主播ID为必填项', data: null }
  }

  if (contentType !== 'live_replay' && contentType !== 'recipe') {
    return { code: 40030, message: '内容类型不正确', data: null }
  }

  // 校验主播存在
  try {
    await db.collection('hosts').doc(hostId).get()
  } catch (_) {
    return { code: 40034, message: '主播不存在', data: null }
  }

  const now = new Date()
  const hostDoc = await db.collection('hosts').doc(hostId).get()
  const hostSlug = (hostDoc.data.slug as string) || ''

  const data: Record<string, unknown> = {
    host_id: hostId,
    host_slug: hostSlug,
    content_type: contentType,
    title,
    description,
    content_category: contentCategory,
    tags,
    duration_sec: durationSec,
    sort_order: sortOrder,
    cover_file_id: coverFileId,
    asset_file_id: assetFileId,
    asset_url: assetUrl,
    status,
    published_at: status === 'published' ? now : null,
    created_at: now,
    updated_at: now,
  }

  const addRes = await db.collection('content_catalog').add({ data })

  return {
    code: 0,
    message: 'ok',
    data: { _id: addRes._id },
  }
}

async function handleUpdate(payload?: Record<string, unknown>) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 40001, message: '获取用户信息失败', data: null }
  }

  const contentId = payload?.content_id as string
  if (!contentId) {
    return { code: 40031, message: '内容不存在', data: null }
  }

  // 校验内容存在
  let existing: Record<string, unknown>
  try {
    const res = await db.collection('content_catalog').doc(contentId).get()
    existing = res.data
  } catch (_) {
    return { code: 40031, message: '内容不存在', data: null }
  }

  const now = new Date()
  const updateData: Record<string, unknown> = { updated_at: now }

  const allowedFields = ['title', 'description', 'content_category', 'content_type',
    'host_id', 'host_slug', 'tags', 'duration_sec', 'sort_order',
    'cover_file_id', 'asset_file_id', 'asset_url', 'status']

  for (const field of allowedFields) {
    if (payload?.[field] !== undefined) {
      updateData[field] = payload[field]
    }
  }

  // 如果状态改为 published，设置发布时间
  if (payload?.status === 'published' && !existing.published_at) {
    updateData.published_at = now
  }

  // 如果改了 host_id，同步更新 host_slug
  if (payload?.host_id) {
    try {
      const hostDoc = await db.collection('hosts').doc(payload.host_id as string).get()
      updateData.host_slug = hostDoc.data.slug as string || ''
    } catch (_) {
      // ignore, keep old slug
    }
  }

  await db.collection('content_catalog').doc(contentId).update({ data: updateData })

  return {
    code: 0,
    message: 'ok',
    data: { _id: contentId }
  }
}

async function handleDetail(payload?: Record<string, unknown>) {
  const contentType = payload?.content_type as string | undefined
  if (contentType !== 'live_replay' && contentType !== 'recipe') {
    return { code: 40030, message: '内容类型不正确', data: null }
  }

  const contentId = payload?.content_id as string | undefined
  if (!contentId) {
    return { code: 40031, message: '内容不存在', data: null }
  }

  let detail: Record<string, unknown>
  try {
    const detailRes = await db.collection('content_catalog').doc(contentId).get()
    detail = detailRes.data
  } catch (_) {
    return { code: 40031, message: '内容不存在', data: null }
  }

  // 游客模式：传入 host_id，校验内容属于该主播即可
  const guestHostId = payload?.host_id as string | undefined
  if (guestHostId) {
    if (
      !detail ||
      detail.host_id !== guestHostId ||
      detail.content_type !== contentType ||
      detail.status !== 'published'
    ) {
      return { code: 40032, message: '内容暂不可访问', data: null }
    }

    detail.cover_file_id = normalizeFileId(detail.cover_file_id)
    detail.asset_file_id = normalizeFileId(detail.asset_file_id)

    return { code: 0, message: 'ok', data: { detail } }
  }

  // 登录模式：按用户绑定关系校验
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 40001, message: '获取用户信息失败', data: null }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { code: 40011, message: '用户不存在，请重新登录', data: null }
  }

  const user = userRes.data[0]

  if (user.status === 'inactive' || user.status === 'banned' || user.status === 'deleted') {
    return { code: 40012, message: '当前账号暂不可用', data: null }
  }

  if (!user.phone) {
    return { code: 40020, message: '请先绑定手机号', data: null }
  }

  const bindRes = await db.collection('user_host_bindings')
    .where({ user_id: user._id, status: 'active' })
    .limit(1)
    .get()

  if (bindRes.data.length === 0) {
    return { code: 40025, message: '暂未绑定主播', data: null }
  }

  const binding = bindRes.data[0]

  if (
    !detail ||
    detail.host_id !== binding.host_id ||
    detail.content_type !== contentType ||
    detail.status !== 'published'
  ) {
    return { code: 40032, message: '内容暂不可访问', data: null }
  }

  detail.cover_file_id = normalizeFileId(detail.cover_file_id)
  detail.asset_file_id = normalizeFileId(detail.asset_file_id)

  return {
    code: 0,
    message: 'ok',
    data: { detail },
  }
}

async function handleAdminUpload(payload?: Record<string, unknown>) {
  const cloudPath = payload?.cloudPath as string
  const fileContent = payload?.fileContent as string
  const encoding = (payload?.encoding as string) || 'base64'

  if (!cloudPath || !fileContent) {
    return { code: 40010, message: '缺少 cloudPath 或 fileContent', data: null }
  }

  try {
    const buffer = encoding === 'base64'
      ? Buffer.from(fileContent, 'base64')
      : Buffer.from(fileContent, 'utf-8')
    const res = await cloud.uploadFile({ cloudPath, fileContent: buffer })
    return { code: 0, message: 'ok', data: { fileID: res.fileID } }
  } catch (e: any) {
    console.error('handleAdminUpload error:', e)
    return { code: 50000, message: '上传失败: ' + e.message, data: null }
  }
}

exports.main = async (event: CloudFunctionEvent) => {
  const { action, payload } = event

  try {
    switch (action) {
      case 'list':
        return await handleList(payload)
      case 'detail':
        return await handleDetail(payload)
      case 'record':
        return await handleRecord(payload)
      case 'adminUpload':
        return await handleAdminUpload(payload)
      case 'create':
        return await handleCreate(payload)
      case 'update':
        return await handleUpdate(payload)
      default:
        return { code: 40004, message: `未知操作: ${action}`, data: null }
    }
  } catch (e: any) {
    console.error('content error:', e)
    return { code: 50000, message: '服务器内部错误', data: null }
  }
}
