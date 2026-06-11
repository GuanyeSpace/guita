const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 批量将 cloud:// 文件 ID 转换为临时 HTTP 链接
async function resolveTempUrls(items) {
  if (!items || items.length === 0) return items;
  
  const fileIds = new Set();
  items.forEach(item => {
    if (item.avatar_file_id) fileIds.add(item.avatar_file_id);
  });
  
  if (fileIds.size === 0) return items;

  try {
    const result = await cloud.getTempFileURL({ fileList: [...fileIds] });
    const urlMap = {};
    result.fileList.forEach(f => {
      if (f.tempFileURL) urlMap[f.fileID] = f.tempFileURL;
    });

    return items.map(item => ({
      ...item,
      avatar_url: item.avatar_file_id ? (urlMap[item.avatar_file_id] || item.avatar_file_id) : '',
    }));
  } catch (e) {
    console.warn('getTempFileURL 失败:', e.message);
    return items.map(item => ({
      ...item,
      avatar_url: item.avatar_file_id || '',
    }));
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { action, payload = {} } = event;

  try {
    switch (action) {

      // ========== listActive ==========
      case 'listActive': {
        const res = await db.collection('hosts')
          .where({ status: 'active' })
          .orderBy('sort_order', 'asc')
          .get();
        const list = await resolveTempUrls(res.data);
        return { code: 0, message: 'ok', data: { list } };
      }

      // ========== bind ==========
      case 'bind': {
        const { host_id } = payload;
        if (!host_id) {
          return { code: 40001, message: '缺少主播 ID', data: null };
        }

        const userRes = await db.collection('users').where({ openid }).get();
        const user = userRes.data[0];
        if (!user) {
          return { code: 40002, message: '用户不存在', data: null };
        }

        if (!user.phone) {
          return { code: 40003, message: '请先绑定手机号', data: null };
        }

        const existingBind = await db.collection('user_host_bindings')
          .where({ guita_id: user.guita_id, status: 'active' })
          .get();
        if (existingBind.data.length > 0) {
          return { code: 40004, message: '已绑定主播，当前版本不支持更换', data: null };
        }

        let host;
        try {
          const hostRes = await db.collection('hosts').doc(host_id).get();
          host = hostRes.data;
        } catch (e) {
          return { code: 40005, message: '主播不存在', data: null };
        }

        if (!host || host.status !== 'active') {
          return { code: 40006, message: '该主播当前不可选', data: null };
        }

        const now = new Date();
        const bindRes = await db.collection('user_host_bindings').add({
          data: {
            guita_id: user.guita_id,
            user_id: user._id,
            host_id: host._id,
            host_slug: host.slug,
            status: 'active',
            locked: true,
            bind_type: 'first_select',
            bound_at: now,
            changed_by: null,
            change_reason: null,
            created_at: now,
            updated_at: now,
          },
        });

        await db.collection('events').add({
          data: {
            guita_id: user.guita_id,
            user_id: user._id,
            event_name: 'guita.host.bind',
            host_id: host._id,
            content_id: null,
            properties: { bind_type: 'first_select', bind_id: bindRes._id },
            occurred_at: now,
          },
        });

        // 转换头像临时链接
        const [resolvedHost] = await resolveTempUrls([host]);

        return { code: 0, message: 'ok', data: { host: resolvedHost, binding: { _id: bindRes._id, host_id: host._id } } };
      }

      // ========== getMyHost ==========
      case 'getMyHost': {
        const userRes = await db.collection('users').where({ openid }).get();
        const user = userRes.data[0];
        if (!user) {
          return { code: 40002, message: '用户不存在', data: null };
        }

        const bindRes = await db.collection('user_host_bindings')
          .where({ guita_id: user.guita_id, status: 'active' })
          .get();

        if (bindRes.data.length === 0) {
          return { code: 0, message: 'ok', data: { host: null } };
        }

        const hostRes = await db.collection('hosts').doc(bindRes.data[0].host_id).get();
        const [resolvedHost] = await resolveTempUrls([hostRes.data]);
        return { code: 0, message: 'ok', data: { host: resolvedHost, binding: bindRes.data[0] } };
      }

      default:
        return { code: 40000, message: `未知 action: ${action}`, data: null };
    }
  } catch (err) {
    console.error('host error:', err);
    return { code: 50000, message: '服务异常，请稍后重试', data: null };
  }
};
