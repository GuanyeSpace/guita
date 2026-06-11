# 归她 MVP 部署与测试说明

## 1. 项目概述

「归她」是一个微信小程序 MVP，核心闭环为：微信登录 → 手机号绑定 → 主播选择与锁定 → 查看回放和食谱。

## 2. 技术栈

- 微信原生小程序 + TypeScript
- 微信云开发（云函数 + 云数据库 + 云存储）
- 云环境 ID：`cloud1-d2gplb1ikea96e2c8`

## 3. 项目结构

```
guita/
├── project.config.json          # 小程序项目配置（已启用 TypeScript）
├── miniprogram/
│   ├── app.ts                   # 入口文件，云开发初始化
│   ├── app.json                 # 全局配置（pages + tabBar）
│   ├── app.wxss                 # 全局样式（CSS 变量 + 通用类）
│   ├── tsconfig.json            # TypeScript 配置
│   ├── typings/index.d.ts       # 全局类型声明
│   ├── constants/index.ts       # 常量（云环境 ID、错误消息、枚举）
│   ├── utils/index.ts           # 工具函数（guita_id 生成、脱敏、日期格式化）
│   ├── services/
│   │   ├── auth.ts              # auth 云函数封装
│   │   ├── host.ts              # host 云函数封装
│   │   ├── content.ts           # content 云函数封装
│   │   └── event.ts             # event 云函数封装
│   ├── pages/
│   │   ├── auth/index.*         # 登录分发页
│   │   ├── bind-phone/index.*   # 手机号绑定页
│   │   ├── host-select/index.*  # 主播选择页
│   │   ├── home/index.*         # 首页（TabBar）
│   │   ├── replay/list.*        # 回放列表页（TabBar）
│   │   ├── replay/detail.*      # 回放详情/视频播放
│   │   ├── recipe/list.*        # 食谱列表页（TabBar）
│   │   ├── recipe/detail.*      # 食谱详情页
│   │   ├── preview/index.*      # 文件预览页
│   │   └── profile/index.*      # 我的页面（TabBar）
│   └── images/tab/              # TabBar 图标
└── cloudfunctions/
    ├── auth/                    # 登录/注册/绑定手机号
    ├── host/                    # 主播列表/绑定/查询
    ├── content/                 # 内容列表/详情/行为记录
    ├── event/                   # 埋点
    └── seeder/                  # 测试数据填充
```

## 4. 需要你在微信开发者工具中操作

### 4.1 打开项目

1. 打开微信开发者工具
2. 选择「导入项目」
3. 目录选择 `guita` 文件夹
4. AppID 使用 `wx797ab310b64be64a`（已有）

### 4.2 开通云开发

1. 点击开发者工具右上角「云开发」按钮
2. 如果未开通，按提示开通云开发
3. 创建环境，环境名称任意，如 `guita-dev`
4. 记录你的云环境 ID，格式如 `cloud1-xxxxx`
5. 更新 `miniprogram/app.ts` 中的 `env` 字段为你的云环境 ID

### 4.3 创建数据库集合

在「云开发 → 数据库」中创建以下 7 个集合：

| 集合名 | 用途 | 权限规则 |
|--------|------|----------|
| `users` | 用户主身份 | 仅创建者可读，云函数可写 |
| `hosts` | 主播信息 | 所有用户可读，仅管理员可写 |
| `user_host_bindings` | 用户-主播绑定 | 仅创建者可读，云函数可写 |
| `content_catalog` | 内容目录 | 所有用户可读，仅管理员可写 |
| `user_content_records` | 用户内容行为 | 仅创建者可读写 |
| `events` | 埋点 | 云函数可写，用户不可读 |
| `operation_logs` | 管理员操作日志 | 仅管理员可读，云函数可写 |

创建完成后，需要为每个集合设置权限：

- `users`：读 → 仅创建者可读，写 → 关闭客户端写
- `hosts`：读 → 所有用户可读，写 → 关闭客户端写
- `user_host_bindings`：读 → 仅创建者可读，写 → 关闭客户端写
- `content_catalog`：读 → 所有用户可读，写 → 关闭客户端写
- `user_content_records`：读 → 仅创建者可读，写 → 仅创建者可写
- `events`：读 → 关闭客户端读，写 → 仅创建者可写
- `operation_logs`：读 → 关闭客户端读，写 → 关闭客户端写

### 4.4 上传并部署云函数

右键点击以下每个云函数文件夹，选择「上传并部署：云端安装依赖」：

1. `cloudfunctions/auth` — 需要 _使用_ 云开发的 `cloud.openapi.phonenumber.getPhoneNumber`
2. `cloudfunctions/host`
3. `cloudfunctions/content`
4. `cloudfunctions/event`
5. `cloudfunctions/seeder` — 用于填充测试数据

### 4.5 配置手机号获取能力

1. 在微信开发者工具 → 云开发 → 设置 → 全局设置 → 添加「手机号获取」的 API 权限
2. 或者在 `cloudfunctions/auth` 的 `config.json` 中已配置：

```json
{
  "permissions": {
    "openapi": ["phonenumber.getPhoneNumber"]
  }
}
```

### 4.6 填充测试数据

1. 在微信开发者工具中，使用「云开发控制台 → 云函数」
2. 选择 `seeder` 云函数
3. 点击「测试」，参数留空，点击「调用」
4. 返回 `code: 0` 表示测试数据创建成功

或者通过代码调用：

```javascript
wx.cloud.callFunction({
  name: 'seeder',
  data: { action: 'seed' }
}).then(res => console.log(res))
```

## 5. 运行测试步骤

### 5.1 首次进入测试

1. 在微信开发者工具中点击「编译」
2. 模拟器应展示登录分发页（带归她 logo）
3. 自动跳转到「绑定手机号」页面
4. 点击「一键绑定手机号」
5. 注意：**手机号获取在模拟器中可能不工作**，需要使用真机调试，或临时使用测试手机号
6. 跳转到「主播选择」页面
7. 选择「灵灵」→ 点击「确认选择」
8. 出现二次确认弹窗
9. 点击「确认绑定」
10. 进入首页，显示灵灵的头像、名称、简介
11. 首页底部显示「最新直播回放」和「精选食谱」模块

### 5.2 二次进入测试

1. 退出小程序再重新进入
2. 应直接进入首页（已绑定主播状态）
3. 不应再看到手机号绑定页和主播选择页

### 5.3 回放列表测试

1. 点击底部「回放」Tab
2. 应显示 2 条回放内容
3. 点击任一回放卡片，进入详情页
4. 详情页展示视频播放器（如有视频文件）
5. 展示标题、描述、发布时间
6. 页面底部显示免责声明

### 5.4 食谱列表测试

1. 点击底部「食谱」Tab
2. 应显示 2 条食谱内容
3. 点击任一食谱卡片，进入详情页
4. 详情页展示封面、标题、标签、描述
5. 点击「查看食谱」按钮跳转到文件预览页（如有文件）
6. 页面底部显示免责声明

### 5.5 我的页面测试

1. 点击底部「我的」Tab
2. 应显示：
   - 用户头像（灰色默认头像）
   - 昵称
   - guita_id（以 GT 开头）
   - 脱敏手机号
   - 绑定主播（灵灵）
   - 注册时间
3. 确认**没有**出现更换主播、解绑主播等按钮

### 5.6 真机测试

真机测试需要在「微信公众平台 → 开发 → 开发管理 → 开发设置」中：
1. 添加开发者微信号
2. 配置服务器域名（云开发通常自动配置）
3. 配置「request 合法域名」包含：`https://api.weixin.qq.com`
4. 如果是预览模式，需在「详情 → 本地设置」中勾选「不校验合法域名」

## 6. 常见问题排查

### 6.1 云函数调用失败

- 检查云环境 ID 是否与 `app.ts` 中的一致
- 检查云函数是否已上传并部署
- 查看云函数日志（开发者工具 → 云开发 → 云函数 → 点击函数名 → 日志）

### 6.2 数据库查询为空

- 检查集合是否已创建
- 检查权限是否设置正确（如 hosts 需要「所有用户可读」）
- 检查是否已运行 `seeder` 云函数插入测试数据

### 6.3 手机号绑定不成功

- 手机号获取仅在真机上可用，模拟器需要特殊处理
- 确认已在微信公众平台完成「手机号快速验证」能力申请
- 检查 `auth` 云函数的 `config.json` 中是否配置了 `phonenumber.getPhoneNumber` 权限

### 6.4 TabBar 不显示

- 确认 `app.json` 中 `tabBar.list` 配置的页面路径正确
- 确认 TabBar 图标文件存在于对应路径
- 确认 `pages/home/index`、`pages/replay/list`、`pages/recipe/list`、`pages/profile/index` 四个页面文件齐全

### 6.5 TypeScript 编译报错

- 在微信开发者工具中确认 `project.config.json` 的 `useCompilerPlugins` 包含 `"typescript"`
- 确认 `miniprogram/tsconfig.json` 文件存在
- 确认 `miniprogram/typings/index.d.ts` 文件存在

## 7. 数据库安全规则配置参考

针对每个集合，建议的安全规则配置：

### users
```json
{
  "read": "doc._openid == auth.openid",
  "write": false
}
```

### hosts
```json
{
  "read": "doc.status == 'active'",
  "write": false
}
```

### user_host_bindings
```json
{
  "read": "doc._openid == auth.openid",
  "write": false
}
```

### content_catalog
```json
{
  "read": "doc.status == 'published'",
  "write": false
}
```

### user_content_records
```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

### events
```json
{
  "read": false,
  "write": false
}
```

### operation_logs
```json
{
  "read": false,
  "write": false
}
```

## 8. 云环境 ID 全局替换

如果你创建了新的云环境，需要在以下文件中替换环境 ID：
- `miniprogram/app.ts` 第 4 行
- `miniprogram/constants/index.ts` 第 2 行

建议使用搜索替换：搜索 `cloud1-d2gplb1ikea96e2c8`，替换为你实际的云环境 ID。

## 9. 云存储路径规范

后续上传文件时，建议按以下路径存放：

| 文件类型 | 路径 |
|----------|------|
| 主播头像 | `hosts/{host_slug}/avatar.{ext}` |
| 回放封面 | `contents/{content_id}/cover.{ext}` |
| 回放视频 | `contents/{content_id}/video.{ext}` |
| 食谱封面 | `contents/{content_id}/cover.{ext}` |
| 食谱文件 (PDF) | `contents/{content_id}/recipe.{ext}` |
| 食谱图片 | `contents/{content_id}/recipe-images/{name}.{ext}` |

## 10. 已知限制

1. **手机号绑定**仅在真机环境下可用，模拟器无法获取手机号。真机测试前需要在微信公众平台开通手机号快速验证能力
2. TabBar 图标为纯色占位图标，后续需要替换为实际设计图标
3. 「用户协议」和「隐私政策」页面暂时以 Toast 提示代替，需要后续补充完整页面
4. 文件预览页对于 PDF 文件的自动打开体验受 `wx.openDocument` API 限制，在部分 Android 机型上可能需要手动点击
5. 主播选择页目前从数据库读取 active 主播，多主播情况下所有用户都能看到，适合主播数量较少的场景
