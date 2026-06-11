const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { action, payload = {} } = event;

  try {
    switch (action) {

      // ========== track ==========
      case 'track': {
        const { event_name, host_id = null, content_id = null, properties = {} } = payload;
        if (!event_name) {
          return { code: 40001, message: '缺少 event_name', data: null };
        }

        // 获取用户信息
        const userRes = await db.collection('users').where({ openid }).get();
        const user = userRes.data[0];
        if (!user) {
          // 即使没有用户也记录（对于匿名事件）
          await db.collection('events').add({
            data: {
              guita_id: '',
              user_id: '',
              event_name,
              host_id,
              content_id,
              properties: { ...properties, anonymous: true },
              occurred_at: new Date(),
            },
          });
          return { code: 0, message: 'ok', data: {} };
        }

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
        });

        return { code: 0, message: 'ok', data: {} };
      }

      default:
        return { code: 40000, message: `未知 action: ${action}`, data: null };
    }
  } catch (err) {
    console.error('event error:', err);
    return { code: 50000, message: '服务异常，请稍后重试', data: null };
  }
};
