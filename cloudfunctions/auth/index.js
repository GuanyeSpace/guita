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
const BASE32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateGuitaId() {
    let id = 'GT';
    for (let i = 0; i < 12; i++) {
        id += BASE32[Math.floor(Math.random() * BASE32.length)];
    }
    return id;
}
async function ensureUniqueGuitaId() {
    for (let attempt = 0; attempt < 5; attempt++) {
        const id = generateGuitaId();
        const res = await db.collection('users').where({ guita_id: id }).count();
        if (res.total === 0)
            return id;
    }
    throw new Error('GENERATE_ID_FAILED');
}
async function handleLogin() {
    const wxContext = wx_server_sdk_1.default.getWXContext();
    const openid = wxContext.OPENID;
    const unionid = wxContext.UNIONID || '';
    if (!openid) {
        return { code: 40001, message: '获取用户信息失败', data: null };
    }
    const userRes = await db.collection('users').where({ openid }).get();
    let user;
    if (userRes.data.length === 0) {
        const now = new Date();
        const guita_id = await ensureUniqueGuitaId();
        user = {
            guita_id,
            openid,
            unionid,
            phone: '',
            nickname: '',
            avatar_url: '',
            status: 'active',
            created_at: now,
            updated_at: now,
        };
        const addRes = await db.collection('users').add({ data: user });
        user._id = addRes._id;
    }
    else {
        user = userRes.data[0];
    }
    if (user.status === 'inactive' || user.status === 'banned' || user.status === 'deleted') {
        return { code: 0, message: 'ok', data: { user, status: 'inactive' } };
    }
    if (!user.phone) {
        return { code: 0, message: 'ok', data: { user, status: 'need_phone' } };
    }
    const bindingRes = await db.collection('user_host_bindings')
        .where({ user_id: user._id, status: 'active' })
        .limit(1)
        .get();
    if (bindingRes.data.length === 0) {
        return { code: 0, message: 'ok', data: { user, status: 'need_host' } };
    }
    return { code: 0, message: 'ok', data: { user, status: 'ready' } };
}
exports.main = async (event) => {
    const { action, payload } = event;
    try {
        switch (action) {
            case 'login':
                return await handleLogin();
            default:
                return { code: 40004, message: `未知操作: ${action}`, data: null };
        }
    }
    catch (e) {
        if (e.message === 'GENERATE_ID_FAILED') {
            return { code: 40002, message: '生成用户ID失败，请重试', data: null };
        }
        console.error('auth error:', e);
        return { code: 50000, message: '服务器内部错误', data: null };
    }
};
