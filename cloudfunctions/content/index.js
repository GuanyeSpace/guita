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
function normalizeFileId(value) {
    if (!value)
        return '';
    if (typeof value === 'string')
        return value;
    if (Array.isArray(value)) {
        const first = value[0];
        if (typeof first === 'string')
            return first;
        if (typeof first === 'object' && first !== null) {
            return first.fileID
                || first.fileId
                || first.url
                || '';
        }
        return '';
    }
    if (typeof value === 'object') {
        const obj = value;
        return obj.fileID || obj.fileId || obj.url || '';
    }
    return '';
}
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
    const list = listRes.data.map((item) => (Object.assign(Object.assign({}, item), { cover_file_id: normalizeFileId(item.cover_file_id), asset_file_id: normalizeFileId(item.asset_file_id) })));
    return {
        code: 0,
        message: 'ok',
        data: {
            list,
            page,
            page_size: pageSize,
            total,
        },
    };
}
async function handleRecord(payload) {
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
    const contentId = payload === null || payload === void 0 ? void 0 : payload.content_id;
    if (!contentId) {
        return { code: 40031, message: '内容不存在', data: null };
    }
    const recordType = payload === null || payload === void 0 ? void 0 : payload.record_type;
    const validTypes = ['view', 'play', 'progress', 'complete', 'preview'];
    if (!recordType || !validTypes.includes(recordType)) {
        return { code: 40033, message: '记录类型不正确', data: null };
    }
    const bindRes = await db.collection('user_host_bindings')
        .where({ user_id: user._id, status: 'active' })
        .limit(1)
        .get();
    const hostId = bindRes.data.length > 0 ? bindRes.data[0].host_id : null;
    const now = new Date();
    const progressSec = (payload === null || payload === void 0 ? void 0 : payload.progress_sec) || 0;
    const completed = !!(payload === null || payload === void 0 ? void 0 : payload.completed);
    // 同一用户 + 同一内容 + 同一 record_type 存在则更新，否则新增
    const existingRes = await db.collection('user_content_records')
        .where({
        user_id: user._id,
        content_id: contentId,
        record_type: recordType,
    })
        .limit(1)
        .get();
    if (existingRes.data.length > 0) {
        await db.collection('user_content_records').doc(existingRes.data[0]._id).update({
            data: {
                progress_sec: Math.max(progressSec, existingRes.data[0].progress_sec || 0),
                completed: completed || existingRes.data[0].completed,
                updated_at: now,
            },
        });
    }
    else {
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
        });
    }
    return { code: 0, message: 'ok', data: null };
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
    detail.cover_file_id = normalizeFileId(detail.cover_file_id);
    detail.asset_file_id = normalizeFileId(detail.asset_file_id);
    return {
        code: 0,
        message: 'ok',
        data: { detail },
    };
}
async function handleAdminUpload(payload) {
    const cloudPath = payload === null || payload === void 0 ? void 0 : payload.cloudPath;
    const fileContent = payload === null || payload === void 0 ? void 0 : payload.fileContent;
    const encoding = (payload === null || payload === void 0 ? void 0 : payload.encoding) || 'base64';
    if (!cloudPath || !fileContent)
        return { code: 40010, message: '缺少 cloudPath 或 fileContent', data: null };
    try {
        const buffer = encoding === 'base64'
            ? Buffer.from(fileContent, 'base64')
            : Buffer.from(fileContent, 'utf-8');
        const res = await wx_server_sdk_1.default.uploadFile({ cloudPath, fileContent: buffer });
        return { code: 0, message: 'ok', data: { fileID: res.fileID } };
    }
    catch (e) {
        console.error('handleAdminUpload error:', e);
        return { code: 50000, message: '上传失败: ' + e.message, data: null };
    }
}
exports.main = async (event) => {
    const { action, payload } = event;
    try {
        switch (action) {
            case 'list':
                return await handleList(payload);
            case 'detail':
                return await handleDetail(payload);
            case 'record':
                return await handleRecord(payload);
            case 'adminUpload':
                return await handleAdminUpload(payload);
            default:
                return { code: 40004, message: `未知操作: ${action}`, data: null };
        }
    }
    catch (e) {
        console.error('content error:', e);
        return { code: 50000, message: '服务器内部错误', data: null };
    }
};
