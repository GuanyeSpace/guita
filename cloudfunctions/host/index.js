"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wx_server_sdk_1 = __importDefault(require("wx-server-sdk"));
wx_server_sdk_1.default.init({
    env: wx_server_sdk_1.default.DYNAMIC_CURRENT_ENV,
});
exports.main = async (event) => {
    const { action, payload } = event;
    console.log(`host: action=${action}`, payload);
    return {
        code: 0,
        message: 'ok',
        data: {
            placeholder: true,
        },
    };
};
