'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wx_server_sdk_1 = __importDefault(require('wx-server-sdk'));
wx_server_sdk_1.default.init({ env: wx_server_sdk_1.default.DYNAMIC_CURRENT_ENV });
const db = wx_server_sdk_1.default.database();

// ===== 内容管理 =====
async function listContent(payload) {
    const query = {};
    if (payload === null || payload === void 0 ? void 0 : payload.content_type) query.content_type = payload.content_type;
    if (payload === null || payload === void 0 ? void 0 : payload.host_id) query.host_id = payload.host_id;
    if (payload === null || payload === void 0 ? void 0 : payload.status) query.status = payload.status;
    const page = Math.max(1, (payload === null || payload === void 0 ? void 0 : payload.page) || 1);
    const pageSize = Math.min(100, Math.max(1, (payload === null || payload === void 0 ? void 0 : payload.page_size) || 50));
    const skip = (page - 1) * pageSize;
    const countRes = await db.collection('content_catalog').where(query).count();
    const res = await db.collection('content_catalog').where(query)
        .orderBy('updated_at', 'desc').skip(skip).limit(pageSize).get();
    return { code: 0, message: 'ok', data: { list: res.data, total: countRes.total, page, page_size: pageSize } };
}

async function getContent(payload) {
    const id = payload === null || payload === void 0 ? void 0 : payload.content_id;
    if (!id) return { code: 40031, message: '缺少 content_id', data: null };
    try {
        const res = await db.collection('content_catalog').doc(id).get();
        return { code: 0, message: 'ok', data: { detail: res.data } };
    }
    catch (_) { return { code: 40031, message: '内容不存在', data: null }; }
}

async function createContent(payload) {
    var _a;
    const title = payload === null || payload === void 0 ? void 0 : payload.title;
    const contentType = payload === null || payload === void 0 ? void 0 : payload.content_type;
    const hostId = payload === null || payload === void 0 ? void 0 : payload.host_id;
    if (!title || !contentType || !hostId)
        return { code: 40030, message: '标题、类型、主播为必填项', data: null };
    if (contentType !== 'live_replay' && contentType !== 'recipe')
        return { code: 40030, message: '内容类型不正确', data: null };
    let hostSlug = '';
    try { const h = await db.collection('hosts').doc(hostId).get(); hostSlug = ((_a = h.data) === null || _a === void 0 ? void 0 : _a.slug) || ''; }
    catch (_) { return { code: 40034, message: '主播不存在', data: null }; }
    const now = new Date();
    const status = (payload === null || payload === void 0 ? void 0 : payload.status) || 'draft';
    const data = {
        host_id: hostId, host_slug: hostSlug, content_type: contentType, title,
        description: (payload === null || payload === void 0 ? void 0 : payload.description) || '',
        content_category: (payload === null || payload === void 0 ? void 0 : payload.content_category) || '',
        tags: (payload === null || payload === void 0 ? void 0 : payload.tags) || [],
        duration_sec: (payload === null || payload === void 0 ? void 0 : payload.duration_sec) || 0,
        sort_order: (payload === null || payload === void 0 ? void 0 : payload.sort_order) || 100,
        cover_file_id: (payload === null || payload === void 0 ? void 0 : payload.cover_file_id) || '',
        asset_file_id: (payload === null || payload === void 0 ? void 0 : payload.asset_file_id) || '',
        asset_url: (payload === null || payload === void 0 ? void 0 : payload.asset_url) || '',
        status,
        published_at: status === 'published' ? now : null,
        created_at: now, updated_at: now,
    };
    const addRes = await db.collection('content_catalog').add({ data });
    return { code: 0, message: 'ok', data: { _id: addRes._id } };
}

async function updateContent(payload) {
    const id = payload === null || payload === void 0 ? void 0 : payload.content_id;
    if (!id) return { code: 40031, message: '缺少 content_id', data: null };
    let existing;
    try { const r = await db.collection('content_catalog').doc(id).get(); existing = r.data; }
    catch (_) { return { code: 40031, message: '内容不存在', data: null }; }
    const now = new Date();
    const updateData = { updated_at: now };
    const fields = ['title', 'description', 'content_category', 'content_type', 'host_id',
        'tags', 'duration_sec', 'sort_order', 'cover_file_id', 'asset_file_id', 'asset_url', 'status'];
    for (const f of fields) {
        if (payload[f] !== undefined)
            updateData[f] = payload[f];
    }
    if (payload.status === 'published' && !existing.published_at)
        updateData.published_at = now;
    if (payload.host_id) {
        try { const h = await db.collection('hosts').doc(payload.host_id).get(); updateData.host_slug = h.data.slug || ''; }
        catch (_) { }
    }
    await db.collection('content_catalog').doc(id).update({ data: updateData });
    return { code: 0, message: 'ok', data: { _id: id } };
}

async function deleteContent(payload) {
    const id = payload === null || payload === void 0 ? void 0 : payload.content_id;
    if (!id) return { code: 40031, message: '缺少 content_id', data: null };
    try { await db.collection('content_catalog').doc(id).remove(); }
    catch (_) { return { code: 40031, message: '删除失败', data: null }; }
    return { code: 0, message: 'ok', data: null };
}

// ===== 主播管理 =====
async function listHosts() {
    const res = await db.collection('hosts').orderBy('sort_order', 'asc').get();
    return { code: 0, message: 'ok', data: { list: res.data } };
}

async function updateHost(payload) {
    const id = payload === null || payload === void 0 ? void 0 : payload.host_id;
    if (!id) return { code: 40031, message: '缺少 host_id', data: null };
    const now = new Date();
    const updateData = { updated_at: now };
    const fields = ['slug', 'name', 'display_name', 'avatar_file_id', 'description',
        'target_user', 'brand_color_primary', 'brand_color_accent', 'sort_order', 'status'];
    for (const f of fields) {
        if (payload[f] !== undefined)
            updateData[f] = payload[f];
    }
    try { await db.collection('hosts').doc(id).update({ data: updateData }); }
    catch (_) { return { code: 40031, message: '更新失败', data: null }; }
    return { code: 0, message: 'ok', data: { _id: id } };
}

// ===== 获取上传凭证（云函数只发凭证，文件直传 COS） =====
const cloudbase = require('@cloudbase/node-sdk');
const tcbApp = cloudbase.init({ env: 'cloud1-d2gplb1ikea96e2c8' });

async function getUploadMetadata(payload) {
    const { cloudPath } = payload || {};
    if (!cloudPath) return { code: 40001, message: '缺少 cloudPath', data: null };
    try {
        const meta = await tcbApp.getUploadMetadata({ cloudPath });
        return { code: 0, message: 'ok', data: meta };
    } catch (e) {
        console.error('getUploadMetadata error:', e);
        return { code: 50000, message: '获取上传凭证失败: ' + e.message, data: null };
    }
}

// 获取 COS STS 临时凭据（供 Web 后台 COS JS SDK 分片上传大文件）
async function getCosStsCredentials(payload) {
    const key = (payload && payload.cloudPath) || 'contents/';
    // 云函数运行时自动注入的环境临时凭据
    const secretId = process.env.TENCENTCLOUD_SECRETID;
    const secretKey = process.env.TENCENTCLOUD_SECRETKEY;
    const token = process.env.TENCENTCLOUD_SESSIONTOKEN;

    console.log('env check - secretId:', !!secretId, 'secretKey:', !!secretKey, 'token:', !!token);

    if (secretId && secretKey) {
        return { code: 0, message: 'ok', data: {
            bucket: '636c-cloud1-d2gplb1ikea96e2c8-1442158757',
            region: 'ap-shanghai',
            credentials: {
                secretId, secretKey,
                token: token || '',
                expiredTime: Math.floor(Date.now() / 1000) + 3600,
            },
            key,
        }};
    }
    return { code: 50000, message: '无法获取 COS 凭据（云函数环境变量缺失）', data: null };
}

exports.main = async (event) => {
    const { action, payload } = event;
    try {
        switch (action) {
            case 'listContent': return await listContent(payload);
            case 'getContent': return await getContent(payload);
            case 'createContent': return await createContent(payload);
            case 'updateContent': return await updateContent(payload);
            case 'deleteContent': return await deleteContent(payload);
            case 'listHosts': return await listHosts();
            case 'updateHost': return await updateHost(payload);
            case 'getUploadMetadata': return await getUploadMetadata(payload);
            case 'getCosStsCredentials': return await getCosStsCredentials(payload);
            default: return { code: 40004, message: `未知操作: ${action}`, data: null };
        }
    }
    catch (e) {
        console.error('admin error:', e);
        return { code: 50000, message: '服务器内部错误', data: null };
    }
};
