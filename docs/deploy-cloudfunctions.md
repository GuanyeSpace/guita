# 归她 - 云函数部署流程

## 云函数提交规范（MVP 阶段）

1. TypeScript 源码文件是 `index.ts`。
2. 云函数运行文件是编译后的 `index.js`。
3. 当前 MVP 阶段允许提交 `index.js`。
4. 每次修改任意 `cloudfunctions/*/index.ts` 后，必须重新运行 `tsc` 编译生成对应 `index.js`。
5. 提交时必须保证 `index.ts` 和 `index.js` 同步。
6. 不允许手动编辑 `index.js`，`index.js` 只能由 TypeScript 编译生成。

## 环境信息

- **云环境 ID**: `cloud1-d2gplb1ikea96e2c8`
- **云函数运行时**: Node.js 20.19
- **项目配置文件**: `cloudbaserc.json`

## 前置条件

1. 微信开发者工具已安装并登录。
2. 已开通微信云开发。
3. 已在 `cloudbaserc.json` 中配置正确的 `envId`。
4. 已在 `miniprogram/app.ts` 中配置正确的 `CLOUD_ENV_ID`。

## 编译单个云函数

```bash
# 以 auth 为例
cd cloudfunctions/auth

# 安装依赖（仅首次或 package.json 变更后）
npm install

# 编译 TypeScript
npx tsc --project tsconfig.json
```

编译后会在同目录生成 `index.js`。

## 部署单个云函数

在微信开发者工具中：

1. 展开左侧「云开发」面板。
2. 右键点击 `cloudfunctions/auth` 目录。
3. 选择「上传并部署：云端安装依赖」。
4. 等待部署完成。

也可以通过微信开发者工具 CLI：

```bash
# 在项目根目录执行
# 需要先开启微信开发者工具的服务端口：设置 → 安全 → 服务端口
微信开发者工具路径/cli cloud functions deploy --envId cloud1-d2gplb1ikea96e2c8 --name auth
```

## 部署全部云函数

在微信开发者工具中：

1. 打开「云开发」面板。
2. 展开 `cloudfunctions` 目录。
3. 依次对每个云函数右键 →「上传并部署：云端安装依赖」。

或者通过 `cloudbaserc.json` 批量部署：

```bash
# 需要安装 @cloudbase/cli（可选方案）
tcb fn deploy auth
tcb fn deploy host
tcb fn deploy content
tcb fn deploy event
```

## 测试 auth.login

### 方式一：云函数调试面板

1. 在微信开发者工具中，右键 `cloudfunctions/auth` →「开启云函数本地调试」。
2. 在弹出的调试面板中输入：

```json
{
  "action": "login",
  "payload": {}
}
```

3. 点击「调用」，查看返回结果。

预期返回（新用户）：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": { ... },
    "status": "need_phone"
  }
}
```

### 方式二：小程序端测试

1. 确保 `pages/auth/index` 为 app.json 中 pages 数组的第一项。
2. 在微信开发者工具中点击「编译」。
3. 小程序启动后自动调用 `auth.login`。
4. 根据返回状态自动跳转。

## 云数据库集合

以下集合需要手动在云开发控制台创建（如不存在）：

### users

| 字段 | 类型 | 说明 |
|---|---|---|
| _id | string | 自动生成 |
| guita_id | string | GT + 12 位 Base32 |
| openid | string | 微信 openid |
| unionid | string | 微信 unionid |
| phone | string | 手机号 |
| nickname | string | 昵称 |
| avatar_url | string | 头像 URL |
| status | string | active / inactive / deleted / banned |
| created_at | Date | 创建时间 |
| updated_at | Date | 更新时间 |

### user_host_bindings

| 字段 | 类型 | 说明 |
|---|---|---|
| _id | string | 自动生成 |
| user_id | string | 关联 users._id |
| host_id | string | 关联 hosts._id |
| status | string | active / inactive |
| created_at | Date | 创建时间 |
| updated_at | Date | 更新时间 |

创建集合路径：微信开发者工具 → 云开发 → 数据库 → 添加集合。

## 常见错误

### 微信开发者工具服务端口未开启

- **错误现象**: CLI 命令无法连接开发者工具。
- **解决方案**: 微信开发者工具 → 设置 → 安全 → 开启「服务端口」。

### 集合不存在

- **错误现象**: 云函数报错 `collection not exists`。
- **解决方案**: 在云开发控制台手动创建 `users` 和 `user_host_bindings` 集合。

### 云函数未部署

- **错误现象**: 小程序端调用返回 `function not found`。
- **解决方案**: 右键云函数目录 →「上传并部署」。

### 环境 ID 错误

- **错误现象**: `cloud init failed` 或 `env not found`。
- **解决方案**: 检查 `cloudbaserc.json` 和 `miniprogram/app.ts` 中的环境 ID 是否一致。

### 云函数缺少依赖

- **错误现象**: `Cannot find module 'wx-server-sdk'`。
- **解决方案**: 部署时选择「云端安装依赖」，或在本地 `npm install` 后上传。
