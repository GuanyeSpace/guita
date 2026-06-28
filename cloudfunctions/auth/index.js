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
        const blockedStatus = user.status === 'banned' ? 'banned' : 'inactive';
        return { code: 0, message: 'ok', data: { user, status: blockedStatus } };
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
async function handleBindPhone(payload) {
    var _a;
    const wxContext = wx_server_sdk_1.default.getWXContext();
    const openid = wxContext.OPENID;
    if (!openid) {
        return { code: 40001, message: '获取用户信息失败', data: null };
    }
    const code = payload === null || payload === void 0 ? void 0 : payload.code;
    if (!code) {
        return { code: 40010, message: '手机号授权失败', data: null };
    }
    const userRes = await db.collection('users').where({ openid }).get();
    if (userRes.data.length === 0) {
        return { code: 40011, message: '用户不存在，请重新登录', data: null };
    }
    const user = userRes.data[0];
    if (user.status === 'inactive' || user.status === 'banned' || user.status === 'deleted') {
        return { code: 40012, message: '当前账号暂不可用', data: null };
    }
    let phoneNumber;
    try {
        const result = await wx_server_sdk_1.default.openapi.phonenumber.getPhoneNumber({ code });
        phoneNumber = (_a = result.phoneInfo) === null || _a === void 0 ? void 0 : _a.phoneNumber;
        if (!phoneNumber) {
            return { code: 40013, message: '手机号解析失败', data: null };
        }
    }
    catch (e) {
        console.error('getPhoneNumber error:', e);
        return { code: 40013, message: '手机号解析失败', data: null };
    }
    const now = new Date();
    await db.collection('users').doc(user._id).update({
        data: {
            phone: phoneNumber,
            updated_at: now,
        },
    });
    user.phone = phoneNumber;
    user.updated_at = now;
    return {
        code: 0,
        message: 'ok',
        data: {
            status: 'need_host',
            user,
        },
    };
}
exports.main = async (event) => {
    const { action, payload } = event;
    try {
        switch (action) {
            case 'login':
                return await handleLogin();
            case 'bindPhone':
                return await handleBindPhone(payload);
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
