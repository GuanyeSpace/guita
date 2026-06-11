const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// guita_id 字符集（排除 0/O/I/1）
const BASE32_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateGuitaId() {
  let id = 'GT';
  for (let i = 0; i < 12; i++) {
    id += BASE32_CHARS[Math.floor(Math.random() * BASE32_CHARS.length)];
  }
  return id;
}

async function generateUniqueGuitaId() {
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    const candidate = generateGuitaId();
    const existing = await db.collection('users').where({ guita_id: candidate }).count();
    if (existing.total === 0) return candidate;
  }
  throw new Error('无法生成唯一 guita_id');
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { action, payload = {} } = event;

  try {
    switch (action) {

      // ========== login ==========
      case 'login': {
        const userRes = await db.collection('users').where({ openid }).get();
        let user = userRes.data[0];

        if (!user) {
          const guitaId = await generateUniqueGuitaId();
          const now = new Date();
          const createRes = await db.collection('users').add({
            data: {
              guita_id: guitaId,
              openid,
              unionid: wxContext.UNIONID || '',
              phone: '',
              nickname: '',
              avatar_url: '',
              status: 'active',
              created_at: now,
              updated_at: now,
            },
          });
          user = { _id: createRes._id, guita_id: guitaId, openid, phone: '', status: 'active' };

          await db.collection('events').add({
            data: {
              guita_id: guitaId,
              user_id: createRes._id,
              event_name: 'guita.auth.login_success',
              host_id: null,
              content_id: null,
              properties: { first_login: true },
              occurred_at: now,
            },
          });
        }

        if (user.status === 'banned' || user.status === 'inactive') {
          return { code: 0, message: 'ok', data: { user, status: user.status } };
        }

        if (!user.phone || user.phone === '') {
          return { code: 0, message: 'ok', data: { user, status: 'need_phone' } };
        }

        const bindRes = await db.collection('user_host_bindings')
          .where({ guita_id: user.guita_id, status: 'active' })
          .get();
        if (bindRes.data.length === 0) {
          return { code: 0, message: 'ok', data: { user, status: 'need_host' } };
        }

        return { code: 0, message: 'ok', data: { user, status: 'ready' } };
      }

      // ========== bindPhone ==========
      case 'bindPhone': {
        const { code } = payload;
        if (!code) {
          return { code: 40001, message: '缺少手机号授权 code', data: null };
        }

        const userRes = await db.collection('users').where({ openid }).get();
        const user = userRes.data[0];
        if (!user) {
          return { code: 40002, message: '用户不存在，请重新登录', data: null };
        }

        let phoneNumber = '';
        try {
          const phoneRes = await cloud.openapi.phonenumber.getPhoneNumber({ code });
          phoneNumber = phoneRes.phoneInfo?.purePhoneNumber || '';
        } catch (phoneErr) {
          console.error('获取手机号失败:', phoneErr);
          return { code: 40003, message: '手机号获取失败，请重试', data: null };
        }

        if (!phoneNumber) {
          return { code: 40004, message: '未能获取到手机号', data: null };
        }

        const now = new Date();
        await db.collection('users').doc(user._id).update({
          data: {
            phone: phoneNumber,
            updated_at: now,
          },
        });

        await db.collection('events').add({
          data: {
            guita_id: user.guita_id,
            user_id: user._id,
            event_name: 'guita.auth.bind_phone_success',
            host_id: null,
            content_id: null,
            properties: {},
            occurred_at: now,
          },
        });

        return { code: 0, message: 'ok', data: { status: 'need_host' } };
      }

      // ========== devBindPhone (开发模式：绕过微信授权直接写入手机号) ==========
      case 'devBindPhone': {
        const { phone } = payload;
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
          return { code: 40001, message: '请输入正确的手机号', data: null };
        }

        const userRes = await db.collection('users').where({ openid }).get();
        const user = userRes.data[0];
        if (!user) {
          return { code: 40002, message: '用户不存在，请重新登录', data: null };
        }

        const now = new Date();
        await db.collection('users').doc(user._id).update({
          data: {
            phone: phone,
            updated_at: now,
          },
        });

        await db.collection('events').add({
          data: {
            guita_id: user.guita_id,
            user_id: user._id,
            event_name: 'guita.auth.bind_phone_success',
            host_id: null,
            content_id: null,
            properties: { dev_mode: true },
            occurred_at: now,
          },
        });

        return { code: 0, message: 'ok', data: { status: 'need_host' } };
      }

      // ========== getMe ==========
      case 'getMe': {
        const userRes = await db.collection('users').where({ openid }).get();
        const user = userRes.data[0];
        if (!user) {
          return { code: 40002, message: '用户不存在', data: null };
        }

        let host = null;
        if (user.phone) {
          const bindRes = await db.collection('user_host_bindings')
            .where({ guita_id: user.guita_id, status: 'active' })
            .get();
          if (bindRes.data.length > 0) {
            const hostRes = await db.collection('hosts').doc(bindRes.data[0].host_id).get();
            host = hostRes.data || null;
          }
        }

        let status = 'ready';
        if (!user.phone) {
          status = 'need_phone';
        } else if (!host) {
          status = 'need_host';
        }

        return { code: 0, message: 'ok', data: { user, host, status } };
      }

      default:
        return { code: 40000, message: `未知 action: ${action}`, data: null };
    }
  } catch (err) {
    console.error('auth error:', err);
    return { code: 50000, message: '服务异常，请稍后重试', data: null };
  }
};
