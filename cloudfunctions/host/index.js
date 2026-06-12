"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
wx_server_sdk_1.default.init({
    env: wx_server_sdk_1.default.DYNAMIC_CURRENT_ENV,
});
const db = wx_server_sdk_1.default.database();
async function handleListActive() {
    const res = await db
        .collection('hosts')
        .where({ status: 'active' })
        .orderBy('sort_order', 'asc')
        .get();
    return {
        code: 0,
        message: 'ok',
        data: { list: res.data },
    };
}
async function handleBind(payload) {
    const wxContext = wx_server_sdk_1.default.getWXContext();
    const openid = wxContext.OPENID;
    if (!openid) {
        return { code: 40001, message: '获取用户信息失败', data: null };
    }
    const userRes = await db.collection('users').where({ openid }).get();
    if (userRes.data.length === 0) {
        return { code: 40011, message: '用户不存在，请重新登录', data: null };
    }
    const user = userRes.data[0];
    if (user.status === 'inactive' || user.status === 'banned' || user.status === 'deleted') {
        return { code: 40012, message: '当前账号暂不可用', data: null };
    }
    if (!user.phone) {
        return { code: 40020, message: '请先绑定手机号', data: null };
    }
    const existBind = await db
        .collection('user_host_bindings')
        .where({ user_id: user._id, status: 'active' })
        .limit(1)
        .get();
    if (existBind.data.length > 0) {
        return { code: 40021, message: '已绑定主播，当前版本暂不支持自行更换', data: null };
    }
    const hostId = payload === null || payload === void 0 ? void 0 : payload.host_id;
    if (!hostId) {
        return { code: 40022, message: '请选择主播', data: null };
    }
    const hostRes = await db.collection('hosts').doc(hostId).get();
    const host = hostRes.data;
    if (!host) {
        return { code: 40023, message: '主播不存在', data: null };
    }
    if (host.status !== 'active') {
        return { code: 40024, message: '主播暂不可选', data: null };
    }
    const now = new Date();
    const bindingData = {
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
    };
    const bindRes = await db.collection('user_host_bindings').add({ data: bindingData });
    await db.collection('events').add({
        data: {
            guita_id: user.guita_id,
            user_id: user._id,
            event_name: 'guita.host.bind',
            host_id: host._id,
            content_id: null,
            properties: { host_slug: host.slug },
            occurred_at: now,
        },
    });
    return {
        code: 0,
        message: 'ok',
        data: {
            host,
            binding: Object.assign({ _id: bindRes._id }, bindingData),
        },
    };
}
async function handleGetMyHost() {
    const wxContext = wx_server_sdk_1.default.getWXContext();
    const openid = wxContext.OPENID;
    if (!openid) {
        return { code: 40001, message: '获取用户信息失败', data: null };
    }
    const userRes = await db.collection('users').where({ openid }).get();
    if (userRes.data.length === 0) {
        return { code: 40011, message: '用户不存在，请重新登录', data: null };
    }
    const user = userRes.data[0];
    const bindRes = await db
        .collection('user_host_bindings')
        .where({ user_id: user._id, status: 'active' })
        .limit(1)
        .get();
    if (bindRes.data.length === 0) {
        return { code: 40025, message: '暂未绑定主播', data: null };
    }
    const binding = bindRes.data[0];
    const hostRes = await db.collection('hosts').doc(binding.host_id).get();
    return {
        code: 0,
        message: 'ok',
        data: {
            host: hostRes.data,
            binding,
        },
    };
}
exports.main = async (event) => {
    const { action, payload } = event;
    try {
        switch (action) {
            case 'listActive':
                return await handleListActive();
            case 'bind':
                return await handleBind(payload);
            case 'getMyHost':
                return await handleGetMyHost();
            default:
                return { code: 40004, message: `未知操作: ${action}`, data: null };
        }
    }
    catch (e) {
        console.error('host error:', e);
        return { code: 50000, message: '服务器内部错误', data: null };
    }
};
