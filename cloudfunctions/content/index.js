const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 批量将 cloud:// 文件 ID 转换为临时 HTTP 链接
async function resolveTempUrls(items) {
  if (!items || items.length === 0) return items;
  
  // 收集所有非空的 file ID
  const fileIds = new Set();
  items.forEach(item => {
    if (item.cover_file_id) fileIds.add(item.cover_file_id);
    if (item.asset_file_id) fileIds.add(item.asset_file_id);
  });
  
  if (fileIds.size === 0) return items;

  try {
    const result = await cloud.getTempFileURL({
      fileList: [...fileIds],
    });
    // 构建 fileID -> tempURL 映射
    const urlMap = {};
    result.fileList.forEach(f => {
      if (f.tempFileURL) urlMap[f.fileID] = f.tempFileURL;
    });

    // 给每个条目附加 _url 字段
    return items.map(item => ({
      ...item,
      cover_url: item.cover_file_id ? (urlMap[item.cover_file_id] || item.cover_file_id) : '',
      asset_url: item.asset_file_id ? (urlMap[item.asset_file_id] || item.asset_file_id) : item.asset_url || '',
    }));
  } catch (e) {
    console.warn('getTempFileURL 失败，降级返回原始 file_id:', e.message);
    return items.map(item => ({
      ...item,
      cover_url: item.cover_file_id || '',
      asset_url: item.asset_file_id || item.asset_url || '',
    }));
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { action, payload = {} } = event;

  // 获取当前用户及其绑定主播
  async function getUserAndHost() {
    const userRes = await db.collection('users').where({ openid }).get();
    const user = userRes.data[0];
    if (!user) return { user: null, host: null };

    const bindRes = await db.collection('user_host_bindings')
      .where({ guita_id: user.guita_id, status: 'active' })
      .get();

    if (bindRes.data.length === 0) return { user, host: null };

    const hostRes = await db.collection('hosts').doc(bindRes.data[0].host_id).get();
    return { user, host: hostRes.data };
  }

  try {
    switch (action) {

      // ========== list ==========
      case 'list': {
        const { user, host } = await getUserAndHost();
        if (!user) return { code: 40002, message: '用户不存在', data: null };
        if (!host) return { code: 40003, message: '请先绑定主播', data: null };

        const { content_type, page = 1, page_size = 20 } = payload;
        if (!content_type) {
          return { code: 40001, message: '缺少 content_type', data: null };
        }

        const where = {
          host_id: host._id,
          content_type,
          status: 'published',
        };

        const countRes = await db.collection('content_catalog').where(where).count();
        const total = countRes.total;

        // 食谱：sort_order 升序 → published_at 倒序；回放：published_at 倒序
        let query = db.collection('content_catalog').where(where);
        if (content_type === 'recipe') {
          query = query.orderBy('sort_order', 'asc').orderBy('published_at', 'desc');
        } else {
          query = query.orderBy('published_at', 'desc');
        }

        const listRes = await query.skip((page - 1) * page_size).limit(page_size).get();

        // 转换临时链接
        const resolvedList = await resolveTempUrls(listRes.data);

        return {
          code: 0,
          message: 'ok',
          data: {
            list: resolvedList,
            page,
            page_size,
            total,
            has_more: page * page_size < total,
          },
        };
      }

      // ========== detail ==========
      case 'detail': {
        const { content_id } = payload;
        if (!content_id) {
          return { code: 40001, message: '缺少 content_id', data: null };
        }

        const { user, host } = await getUserAndHost();
        if (!user) return { code: 40002, message: '用户不存在', data: null };
        if (!host) return { code: 40003, message: '请先绑定主播', data: null };

        let content;
        try {
          const contentRes = await db.collection('content_catalog').doc(content_id).get();
          content = contentRes.data;
        } catch (e) {
          return { code: 40004, message: '内容不存在', data: null };
        }

        if (content.host_id !== host._id) {
          return { code: 40005, message: '无权访问该内容', data: null };
        }
        if (content.status !== 'published') {
          return { code: 40006, message: '该内容已下架', data: null };
        }

        // 转换临时链接
        const [resolved] = await resolveTempUrls([content]);
        content = resolved;

        // 自动记录 view 行为
        const now = new Date();
        await db.collection('user_content_records').add({
          data: {
            guita_id: user.guita_id,
            user_id: user._id,
            host_id: host._id,
            content_id: content._id,
            record_type: 'view',
            progress_sec: 0,
            completed: false,
            created_at: now,
            updated_at: now,
          },
        });

        return { code: 0, message: 'ok', data: { content } };
      }

      // ========== record ==========
      case 'record': {
        const { content_id, record_type, progress_sec = 0, completed = false } = payload;
        if (!content_id || !record_type) {
          return { code: 40001, message: '缺少必要参数', data: null };
        }

        const { user, host } = await getUserAndHost();
        if (!user) return { code: 40002, message: '用户不存在', data: null };

        const now = new Date();

        const existing = await db.collection('user_content_records')
          .where({ user_id: user._id, content_id, record_type })
          .orderBy('created_at', 'desc')
          .limit(1)
          .get();

        if (existing.data.length > 0) {
          await db.collection('user_content_records').doc(existing.data[0]._id).update({
            data: { progress_sec, completed, updated_at: now },
          });
        } else {
          await db.collection('user_content_records').add({
            data: {
              guita_id: user.guita_id,
              user_id: user._id,
              host_id: host ? host._id : '',
              content_id,
              record_type,
              progress_sec,
              completed,
              created_at: now,
              updated_at: now,
            },
          });
        }

        return { code: 0, message: 'ok', data: {} };
      }

      // ========== latest ==========
      case 'latest': {
        const { user, host } = await getUserAndHost();
        if (!user) return { code: 40002, message: '用户不存在', data: null };
        if (!host) return { code: 40003, message: '请先绑定主播', data: null };

        const [replayRes, recipeRes] = await Promise.all([
          db.collection('content_catalog')
            .where({ host_id: host._id, content_type: 'live_replay', status: 'published' })
            .orderBy('published_at', 'desc')
            .limit(3)
            .get(),
          db.collection('content_catalog')
            .where({ host_id: host._id, content_type: 'recipe', status: 'published' })
            .orderBy('sort_order', 'asc')
            .orderBy('published_at', 'desc')
            .limit(3)
            .get(),
        ]);

        // 批量转换临时链接
        const allItems = [...replayRes.data, ...recipeRes.data];
        const resolvedAll = await resolveTempUrls(allItems);

        const replays = resolvedAll.filter(item => item.content_type === 'live_replay');
        const recipes = resolvedAll.filter(item => item.content_type === 'recipe');

        return { code: 0, message: 'ok', data: { replays, recipes } };
      }

      default:
        return { code: 40000, message: `未知 action: ${action}`, data: null };
    }
  } catch (err) {
    console.error('content error:', err);
    return { code: 50000, message: '服务异常，请稍后重试', data: null };
  }
};
