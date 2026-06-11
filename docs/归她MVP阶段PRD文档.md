<aside> 📌

**用途**：本 PRD 直接交给 Claude / 其他 AI 开发者执行开发。

**目标**：开发一个基于微信原生小程序 + 微信云开发的「归她」MVP。

**核心闭环**：微信登录 → 绑定手机号 → 首次选择并锁定主播 → 查看该主播的直播回放和食谱。

</aside>

## 1. 项目目标

开发「归她」小程序 MVP。

MVP 只做一件事：

> 用户首次进入小程序后，完成微信登录和手机号绑定，选择 1 位主播并锁定；之后小程序只展示该主播的直播回放和食谱内容。

## 2. 技术栈要求

必须使用：

- 微信原生小程序
- TypeScript
- 微信云开发
- 云函数
- 云数据库
- 云存储
- 微信开发者工具

不得使用：

- 自建服务器
- NestJS / Express / FastAPI
- MySQL / PostgreSQL
- 第三方 SaaS
- 企业微信参数识别
- 支付、会员、AI、打卡、社区、电商

## 3. MVP 功能范围

### 必须开发

1. 微信登录
2. 手机号绑定
3. 主播选择页
4. 主播唯一绑定
5. 主播首页
6. 直播回放列表
7. 直播回放详情 / 视频播放
8. 食谱列表
9. 食谱详情 / 文件预览
10. 我的页面
11. 云数据库集合
12. 云函数
13. 基础测试数据

### 明确不开发

- 用户自行更换主播
- 用户绑定多个主播
- 企微来源参数
- 企业微信回调
- 打卡
- 支付
- 会员
- AI
- 训练营
- 社区
- 电商
- 复杂后台 CMS

## 4. 用户主流程

### 4.1 首次进入

```
打开小程序
→ 微信登录
→ 创建或读取用户
→ 判断手机号
→ 未绑定手机号：进入手机号绑定页
→ 绑定手机号
→ 判断主播绑定
→ 未绑定主播：进入主播选择页
→ 选择 1 位主播
→ 二次确认
→ 写入主播绑定
→ 进入该主播首页
```

### 4.2 二次进入

```
打开小程序
→ 微信登录 / 获取用户状态
→ 已绑定手机号 + 已绑定主播
→ 直接进入主播首页
```

### 4.3 中断后继续

```
已登录但未绑定手机号 → 手机号绑定页
已绑定手机号但未绑定主播 → 主播选择页
已全部完成 → 首页
```

## 5. 页面清单

|页面|路径建议|说明|
|---|---|---|
|登录分发页|`/pages/auth/index`|登录、创建用户、判断状态、分发路由|
|手机号绑定页|`/pages/bind-phone/index`|强制绑定手机号|
|主播选择页|`/pages/host-select/index`|选择唯一主播|
|首页|`/pages/home/index`|当前绑定主播首页|
|回放列表页|`/pages/replay/list`|当前主播回放列表|
|回放详情页|`/pages/replay/detail`|视频播放|
|食谱列表页|`/pages/recipe/list`|当前主播食谱列表|
|食谱详情页|`/pages/recipe/detail`|食谱说明和文件预览入口|
|文件预览页|`/pages/preview/index`|PDF / 图片预览|
|我的页面|`/pages/profile/index`|用户信息和绑定主播|

底部 Tab：

- 首页
- 回放
- 食谱
- 我的

## 6. 页面需求

### 6.1 登录分发页

职责：

- 初始化云开发
- 调用 `auth.login`
- 获取用户状态
- 按状态跳转

状态规则：

```
need_phone → 手机号绑定页
need_host → 主播选择页
ready → 首页
inactive / banned → 显示账号不可用
```

验收：

- 首次进入能创建用户
- 二次进入不会重复创建用户
- 能按用户状态正确跳转

### 6.2 手机号绑定页

页面内容：

- 标题：绑定手机号
- 文案：为了帮你保存回放、食谱和后续服务记录，请先绑定手机号。
- 按钮：一键绑定手机号
- 协议提示：《用户协议》《隐私政策》

规则：

- 未绑定手机号不能进入主播选择页
- 用户拒绝授权则停留当前页
- 手机号展示必须脱敏

验收：

- 绑定成功后写入 `users.phone`
- 成功后进入主播选择页
- 失败提示：`刚刚网络有点慢，再试一次好么？`

### 6.3 主播选择页

数据来源：

- 从 `hosts` 集合读取 `status = active` 的主播
- 按 `sort_order` 升序排列
- 不允许前端硬编码主播列表

主播卡片展示：

- 头像
- 显示名
- 简介
- 适合人群

规则：

- 用户只能选择 1 位主播
- 选择后必须二次确认
- 绑定成功后用户端不可更换主播
- 已绑定用户不得再次进入此页改绑

二次确认文案：

```
你将绑定「{display_name}」。

绑定后，小程序会展示这位老师的直播回放和食谱内容。
当前版本暂不支持自行更换主播，请确认选择。
```

验收：

- 只能单选
- 绑定写入 `user_host_bindings`
- 绑定后进入首页
- 用户端无切换 / 解绑入口

### 6.4 首页

页面结构：

```
顶部：主播头像 / 名称 / 简介
模块 1：最新直播回放 3 条
模块 2：精选食谱 3 条
底部 Tab：首页 / 回放 / 食谱 / 我的
```

数据规则：

- 查询当前用户 active 主播绑定
- 只展示该主播内容
- 只展示 `status = published` 内容
- 不展示其他主播内容

验收：

- 首页展示绑定主播
- 首页回放和食谱均按主播过滤
- 未绑定主播不能进入首页

### 6.5 回放列表页

查询规则：

```
content_type = live_replay
host_id = 当前绑定主播
status = published
按 published_at 倒序
```

展示字段：

- 封面
- 标题
- 简介
- 时长
- 发布时间

验收：

- 只展示绑定主播回放
- 下架内容不展示
- 空列表有友好提示
- 点击进入详情

### 6.6 回放详情页

页面内容：

- 视频播放器
- 标题
- 简介
- 发布时间
- 免责声明

要求：

- 使用微信小程序 `video` 组件
- 视频地址来自云数据库内容字段
- 打开页面记录内容行为
- 视频失败提示：`刚刚网络有点慢，再试一次好么？`

免责声明：

```
本小程序提供的内容仅作参考，不构成医疗建议。
```

### 6.7 食谱列表页

查询规则：

```
content_type = recipe
host_id = 当前绑定主播
status = published
按 sort_order 升序、published_at 倒序
```

展示字段：

- 封面
- 标题
- 简介
- 标签

验收：

- 只展示绑定主播食谱
- 下架内容不展示
- 点击进入详情

### 6.8 食谱详情页

页面内容：

- 封面
- 标题
- 简介
- 标签
- 查看食谱按钮
- 免责声明

要求：

- 支持 PDF / 图片预览
- 打开页面记录内容行为
- 文件失败提示：`刚刚网络有点慢，再试一次好么？`

### 6.9 我的页面

展示：

- 用户头像
- 用户昵称
- 脱敏手机号
- `guita_id`
- 当前绑定主播
- 账号创建时间

不得展示：

- 更换主播
- 解绑主播
- 关注更多主播
- 会员
- 积分
- 打卡

## 7. 云数据库设计

### 7.1 集合总览

必须创建：

- `users`
- `hosts`
- `user_host_bindings`
- `content_catalog`
- `user_content_records`
- `events`
- `operation_logs`

### 7.2 `users`

用途：用户主身份。

```json
{
  "_id": "auto",
  "guita_id": "GT8X9K2M4P7Q",
  "openid": "wechat_openid",
  "unionid": "wechat_unionid_or_empty",
  "phone": "13800000000",
  "nickname": "",
  "avatar_url": "",
  "status": "active",
  "created_at": "Date",
  "updated_at": "Date"
}
```

规则：

- `guita_id` 必须唯一
- `openid` 必须唯一
- `phone` 绑定后必填
- `status`：`active` / `inactive` / `deleted` / `banned`
- openid 不能作为业务主键

### 7.3 `hosts`

用途：主播信息。

```json
{
  "_id": "host_linling",
  "slug": "linling",
  "name": "灵灵",
  "display_name": "灵灵",
  "avatar_file_id": "cloud://xxx",
  "description": "温和运动陪伴，适合日常跟练。",
  "target_user": "女性用户",
  "brand_color_primary": "#F28C48",
  "brand_color_accent": "#FFF3E6",
  "sort_order": 1,
  "status": "active",
  "created_at": "Date",
  "updated_at": "Date"
}
```

规则：

- `slug` 唯一
- `status = active` 才前端展示
- 按 `sort_order` 排序

### 7.4 `user_host_bindings`

用途：用户与主播绑定关系。

```json
{
  "_id": "auto",
  "guita_id": "GT8X9K2M4P7Q",
  "user_id": "users._id",
  "host_id": "host_linling",
  "host_slug": "linling",
  "status": "active",
  "locked": true,
  "bind_type": "first_select",
  "bound_at": "Date",
  "changed_by": null,
  "change_reason": null,
  "created_at": "Date",
  "updated_at": "Date"
}
```

规则：

- 一个用户只能有一条 `status = active` 记录
- 用户端不能修改
- 后台改绑时：旧记录改 `inactive`，新增新记录

### 7.5 `content_catalog`

用途：统一存储直播回放和食谱。

```json
{
  "_id": "content_xxx",
  "host_id": "host_linling",
  "host_slug": "linling",
  "content_type": "live_replay",
  "content_category": "sport",
  "title": "直播回放标题",
  "description": "",
  "cover_file_id": "cloud://xxx",
  "asset_file_id": "cloud://xxx",
  "asset_url": "",
  "duration_sec": 1800,
  "tags": ["入门", "跟练"],
  "status": "published",
  "sort_order": 100,
  "published_at": "Date",
  "created_at": "Date",
  "updated_at": "Date"
}
```

`content_type` 只允许：

- `live_replay`
- `recipe`

`status`：

- `draft`
- `published`
- `archived`

### 7.6 `user_content_records`

用途：记录用户内容行为。

```json
{
  "_id": "auto",
  "guita_id": "GT8X9K2M4P7Q",
  "user_id": "users._id",
  "host_id": "host_linling",
  "content_id": "content_xxx",
  "record_type": "view",
  "progress_sec": 0,
  "completed": false,
  "created_at": "Date",
  "updated_at": "Date"
}
```

`record_type`：

- `view`
- `play`
- `progress`
- `complete`
- `preview`

### 7.7 `events`

用途：埋点。

```json
{
  "_id": "auto",
  "guita_id": "GT8X9K2M4P7Q",
  "user_id": "users._id",
  "event_name": "guita.host.bind",
  "host_id": "host_linling",
  "content_id": null,
  "properties": {},
  "occurred_at": "Date"
}
```

### 7.8 `operation_logs`

用途：管理员操作日志。

```json
{
  "_id": "auto",
  "action": "change_host_binding",
  "target_user_id": "users._id",
  "target_guita_id": "GT8X9K2M4P7Q",
  "operator": "admin",
  "before": {},
  "after": {},
  "reason": "",
  "created_at": "Date"
}
```

## 8. 云函数设计

### 8.1 云函数列表

必须实现：

- `auth`
- `host`
- `content`
- `event`

### 8.2 通用入参

```json
{
  "action": "login",
  "payload": {}
}
```

### 8.3 通用返回

成功：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

失败：

```json
{
  "code": 40001,
  "message": "错误说明",
  "data": null
}
```

### 8.4 `auth` 云函数

#### `auth.login`

逻辑：

1. `cloud.getWXContext()` 获取 openid / appid / unionid
2. 查询 `users.openid`
3. 不存在则创建用户
4. 若无 `guita_id`，生成 `guita_id`
5. 判断手机号是否存在
6. 判断主播绑定是否存在
7. 返回状态

返回状态：

- `need_phone`
- `need_host`
- `ready`
- `inactive`
- `banned`

返回示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": {},
    "status": "need_phone"
  }
}
```

#### `auth.bindPhone`

入参：

```json
{
  "action": "bindPhone",
  "payload": {
    "code": "微信手机号授权 code"
  }
}
```

逻辑：

1. 获取当前 openid
2. 解析手机号
3. 更新 `users.phone`
4. 返回 `need_host`

#### `auth.getMe`

返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": {},
    "host": {},
    "status": "ready"
  }
}
```

### 8.5 `host` 云函数

#### `host.listActive`

返回 active 主播列表。

#### `host.bind`

入参：

```json
{
  "action": "bind",
  "payload": {
    "host_id": "host_linling"
  }
}
```

逻辑：

1. 获取当前用户
2. 检查是否已绑定手机号
3. 检查是否已有 active 主播绑定
4. 检查主播是否存在且 active
5. 创建 `user_host_bindings`
6. 写入 `events`
7. 返回主播信息

错误：

- 未绑定手机号：不允许绑定
- 已绑定主播：不允许重复绑定
- 主播不存在：报错
- 主播下架：报错

#### `host.getMyHost`

返回当前用户 active 绑定主播。

### 8.6 `content` 云函数

#### `content.list`

入参：

```json
{
  "action": "list",
  "payload": {
    "content_type": "live_replay",
    "page": 1,
    "page_size": 20
  }
}
```

逻辑：

1. 获取当前用户绑定主播
2. 用 `host_id` 过滤
3. 用 `content_type` 过滤
4. 只返回 `status = published`
5. 返回分页数据

#### `content.detail`

入参：

```json
{
  "action": "detail",
  "payload": {
    "content_id": "content_xxx"
  }
}
```

逻辑：

1. 获取当前用户绑定主播
2. 查询内容
3. 校验内容属于当前主播
4. 校验 `status = published`
5. 返回详情

#### `content.record`

写入或更新 `user_content_records`。

### 8.7 `event` 云函数

#### `event.track`

写入 `events` 集合。

入参：

```json
{
  "action": "track",
  "payload": {
    "event_name": "guita.home.view",
    "host_id": "host_linling",
    "content_id": null,
    "properties": {}
  }
}
```

## 9. `guita_id` 规则

格式：

```
GT + 12 位 Base32 字符
```

示例：

```
GT8X9K2M4P7Q
```

字符集：

```
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```

要求：

- 随机生成
- 不递增
- 排除 `0` / `O` / `I` / `1`
- 生成后检查唯一性
- 冲突则重新生成

## 10. 云存储设计

路径建议：

|文件|路径|
|---|---|
|主播头像|`hosts/{host_slug}/avatar.*`|
|内容封面|`contents/{content_id}/cover.*`|
|回放视频|`contents/{content_id}/video.*`|
|食谱 PDF|`contents/{content_id}/recipe.pdf`|
|食谱图片|`contents/{content_id}/recipe-images/*`|

规则：

- 文件 ID 存入 `content_catalog`
- 前端不写死文件地址
- 文件读取失败展示友好提示

## 11. 埋点

必须记录：

- `guita.auth.login_success`
- `guita.auth.bind_phone_success`
- `guita.host.select_view`
- `guita.host.bind`
- `guita.home.view`
- `guita.content.replay_list_view`
- `guita.content.replay_open`
- `guita.content.recipe_list_view`
- `guita.content.recipe_open`
- `guita.profile.view`

## 12. 权限与安全

规则：

- 用户只能读取自己的用户数据
- 用户只能访问自己绑定主播的内容
- 用户不能直接写 `user_host_bindings`
- 用户不能直接写 `hosts`
- 用户不能直接写 `content_catalog`
- 关键写操作通过云函数完成
- 手机号展示必须脱敏

云数据库安全规则方向：

- `users`：本人可读，云函数写
- `user_host_bindings`：本人可读，云函数写
- `hosts`：active 可读，管理员写
- `content_catalog`：published 可读，管理员写
- `events`：云函数写，用户不可读全量

## 13. 合规文案

所有运动 / 饮食 / 身体相关页面底部展示：

```
本小程序提供的内容仅作参考，不构成医疗建议。
```

禁止词：

- 诊断
- 治疗
- 处方
- 治愈
- 医疗效果
- 疾病
- 症状

推荐词：

- 动作建议
- 饮食习惯
- 体态参考
- 运动陪伴
- 健康生活方式

## 14. 基础测试数据

### 14.1 主播

```json
{
  "_id": "host_linling",
  "slug": "linling",
  "name": "灵灵",
  "display_name": "灵灵",
  "avatar_file_id": "",
  "description": "温和运动陪伴，适合日常跟练。",
  "target_user": "女性用户",
  "brand_color_primary": "#F28C48",
  "brand_color_accent": "#FFF3E6",
  "sort_order": 1,
  "status": "active",
  "created_at": "Date",
  "updated_at": "Date"
}
```

### 14.2 回放

至少 2 条：

```json
{
  "_id": "replay_001",
  "host_id": "host_linling",
  "host_slug": "linling",
  "content_type": "live_replay",
  "content_category": "sport",
  "title": "直播回放 01",
  "description": "适合新用户的入门跟练。",
  "cover_file_id": "",
  "asset_file_id": "",
  "asset_url": "",
  "duration_sec": 1200,
  "tags": ["入门", "跟练"],
  "status": "published",
  "sort_order": 100,
  "published_at": "Date",
  "created_at": "Date",
  "updated_at": "Date"
}
```

### 14.3 食谱

至少 2 条：

```json
{
  "_id": "recipe_001",
  "host_id": "host_linling",
  "host_slug": "linling",
  "content_type": "recipe",
  "content_category": "food",
  "title": "一周轻食食谱",
  "description": "适合日常参考的饮食搭配。",
  "cover_file_id": "",
  "asset_file_id": "",
  "asset_url": "",
  "duration_sec": 0,
  "tags": ["食谱", "饮食习惯"],
  "status": "published",
  "sort_order": 100,
  "published_at": "Date",
  "created_at": "Date",
  "updated_at": "Date"
}
```

## 15. 开发顺序

请按顺序开发：

1. 初始化微信原生小程序项目
2. 配置云开发环境
3. 配置云函数目录
4. 创建云数据库集合
5. 创建测试数据
6. 实现 `auth` 云函数
7. 实现登录分发页
8. 实现手机号绑定页
9. 实现 `host` 云函数
10. 实现主播选择页
11. 实现首页
12. 实现 `content` 云函数
13. 实现回放列表页
14. 实现回放详情页
15. 实现食谱列表页
16. 实现食谱详情页
17. 实现我的页面
18. 实现 `event` 云函数
19. 真机测试
20. 输出部署说明

## 16. 验收标准

### 登录

- [ ] 首次打开能创建用户
- [ ] 重复进入不重复创建用户
- [ ] 用户有唯一 `guita_id`
- [ ] openid 不作为业务主键
- [ ] 未绑定手机号不能继续

### 手机号

- [ ] 手机号可绑定
- [ ] 手机号写入 `users`
- [ ] 手机号展示脱敏
- [ ] 拒绝授权不能绕过

### 主播

- [ ] 主播从云数据库读取
- [ ] 只能选择 1 位
- [ ] 绑定前二次确认
- [ ] 绑定后不能更换
- [ ] 绑定写入 `user_host_bindings`

### 内容

- [ ] 首页只展示绑定主播内容
- [ ] 回放列表只展示绑定主播回放
- [ ] 回放详情可播放
- [ ] 食谱列表只展示绑定主播食谱
- [ ] 食谱详情可预览文件
- [ ] 下架内容不展示

### 我的

- [ ] 展示用户信息
- [ ] 展示脱敏手机号
- [ ] 展示 `guita_id`
- [ ] 展示绑定主播
- [ ] 无更换主播入口

### 云开发

- [ ] 云函数可本地调试
- [ ] 云函数可部署
- [ ] 云数据库读写正常
- [ ] 云存储文件可读取
- [ ] iOS 真机通过
- [ ] Android 真机通过

## 17. 最终交付物

必须交付：

- 完整小程序源码
- 云函数源码
- 云数据库集合说明
- 测试数据说明
- 云存储路径说明
- 本地运行说明
- 云函数部署说明
- 真机测试说明
- 已知问题清单

## 18. 成功标准

本 MVP 成功的标准：

> 新用户可以从零进入小程序，完成微信登录、手机号绑定、主播绑定，并查看该主播的直播回放和食谱；再次进入时直接进入已绑定主播首页，且用户端无法自行切换主播。