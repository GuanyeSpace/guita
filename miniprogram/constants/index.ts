// 常量与枚举
export const CLOUD_ENV = 'cloud1-d2gplb1ikea96e2c8';

export const ERROR_MESSAGES = {
  NETWORK: '刚刚网络有点慢，再试一次好么？',
  SERVER: '服务异常，请稍后重试',
  UNKNOWN: '出了点小问题，请重试',
};

export const BASE32_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BANNED: 'banned',
  DELETED: 'deleted',
};

export const CONTENT_TYPE = {
  LIVE_REPLAY: 'live_replay',
  RECIPE: 'recipe',
};

export const CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const RECORD_TYPE = {
  VIEW: 'view',
  PLAY: 'play',
  PROGRESS: 'progress',
  COMPLETE: 'complete',
  PREVIEW: 'preview',
};

export const EVENT_NAMES = {
  AUTH_LOGIN_SUCCESS: 'guita.auth.login_success',
  AUTH_BIND_PHONE_SUCCESS: 'guita.auth.bind_phone_success',
  HOST_SELECT_VIEW: 'guita.host.select_view',
  HOST_BIND: 'guita.host.bind',
  HOME_VIEW: 'guita.home.view',
  CONTENT_REPLAY_LIST_VIEW: 'guita.content.replay_list_view',
  CONTENT_REPLAY_OPEN: 'guita.content.replay_open',
  CONTENT_RECIPE_LIST_VIEW: 'guita.content.recipe_list_view',
  CONTENT_RECIPE_OPEN: 'guita.content.recipe_open',
  PROFILE_VIEW: 'guita.profile.view',
};
