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
async function handleList(payload) {
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
    const bindRes = await db.collection('user_host_bindings')
        .where({ user_id: user._id, status: 'active' })
        .limit(1)
        .get();
    if (bindRes.data.length === 0) {
        return { code: 40025, message: '暂未绑定主播', data: null };
    }
    const binding = bindRes.data[0];
    const contentType = payload === null || payload === void 0 ? void 0 : payload.content_type;
    if (contentType !== 'live_replay' && contentType !== 'recipe') {
        return { code: 40030, message: '内容类型不正确', data: null };
    }
    const page = Math.max(1, (payload === null || payload === void 0 ? void 0 : payload.page) || 1);
    const pageSize = Math.min(50, Math.max(1, (payload === null || payload === void 0 ? void 0 : payload.page_size) || 20));
    const skip = (page - 1) * pageSize;
    const where = {
        host_id: binding.host_id,
        content_type: contentType,
        status: 'published',
    };
    const countRes = await db.collection('content_catalog').where(where).count();
    const total = countRes.total;
    let query = db.collection('content_catalog').where(where);
    if (contentType === 'live_replay') {
        query = query.orderBy('published_at', 'desc');
    }
    else {
        query = query.orderBy('sort_order', 'asc').orderBy('published_at', 'desc');
    }
    const listRes = await query.skip(skip).limit(pageSize).get();
    return {
        code: 0,
        message: 'ok',
        data: {
            list: listRes.data,
            page,
            page_size: pageSize,
            total,
        },
    };
}
async function handleDetail(payload) {
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
    const bindRes = await db.collection('user_host_bindings')
        .where({ user_id: user._id, status: 'active' })
        .limit(1)
        .get();
    if (bindRes.data.length === 0) {
        return { code: 40025, message: '暂未绑定主播', data: null };
    }
    const binding = bindRes.data[0];
    const contentType = payload === null || payload === void 0 ? void 0 : payload.content_type;
    if (contentType !== 'live_replay' && contentType !== 'recipe') {
        return { code: 40030, message: '内容类型不正确', data: null };
    }
    const contentId = payload === null || payload === void 0 ? void 0 : payload.content_id;
    if (!contentId) {
        return { code: 40031, message: '内容不存在', data: null };
    }
    let detail;
    try {
        const detailRes = await db.collection('content_catalog').doc(contentId).get();
        detail = detailRes.data;
    }
    catch (_) {
        return { code: 40031, message: '内容不存在', data: null };
    }
    if (!detail ||
        detail.host_id !== binding.host_id ||
        detail.content_type !== contentType ||
        detail.status !== 'published') {
        return { code: 40032, message: '内容暂不可访问', data: null };
    }
    return {
        code: 0,
        message: 'ok',
        data: { detail },
    };
}
exports.main = async (event) => {
    const { action, payload } = event;
    try {
        switch (action) {
            case 'list':
                return await handleList(payload);
            case 'detail':
                return await handleDetail(payload);
            default:
                return { code: 40004, message: `未知操作: ${action}`, data: null };
        }
    }
    catch (e) {
        console.error('content error:', e);
        return { code: 50000, message: '服务器内部错误', data: null };
    }
};
