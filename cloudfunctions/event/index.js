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
async function handleTrack(payload) {
    var _a, _b, _c;
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
    const event_name = payload === null || payload === void 0 ? void 0 : payload.event_name;
    if (!event_name || typeof event_name !== 'string' || event_name.trim() === '') {
        return { code: 40040, message: '事件名不合法', data: null };
    }
    const host_id = (_a = payload === null || payload === void 0 ? void 0 : payload.host_id) !== null && _a !== void 0 ? _a : null;
    const content_id = (_b = payload === null || payload === void 0 ? void 0 : payload.content_id) !== null && _b !== void 0 ? _b : null;
    const properties = (_c = payload === null || payload === void 0 ? void 0 : payload.properties) !== null && _c !== void 0 ? _c : {};
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
    return {
        code: 0,
        message: 'ok',
        data: { tracked: true },
    };
}
exports.main = async (event) => {
    const { action, payload } = event;
    try {
        switch (action) {
            case 'track':
                return await handleTrack(payload);
            default:
                return { code: 40004, message: `未知操作: ${action}`, data: null };
        }
    }
    catch (e) {
        console.error('event error:', e);
        return { code: 50000, message: '服务器内部错误', data: null };
    }
};
