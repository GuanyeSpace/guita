const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { action = 'seed' } = event;

  if (action === 'clear') {
    return clearData();
  }
  return seedData();
};

async function seedData() {
  const now = new Date();

  // ========== 插入主播 ==========
  const hostData = {
    _id: 'host_linling',
    slug: 'linling',
    name: '灵灵',
    display_name: '灵灵',
    avatar_file_id: '',
    description: '温和运动陪伴，适合日常跟练。',
    target_user: '女性用户',
    brand_color_primary: '#F28C48',
    brand_color_accent: '#FFF3E6',
    sort_order: 1,
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  let hostResult = { message: '已存在' };
  try {
    const existing = await db.collection('hosts').doc('host_linling').get();
    if (!existing.data) {
      await db.collection('hosts').add({ data: hostData });
      hostResult = { message: '新增' };
    }
  } catch (e) {
    await db.collection('hosts').add({ data: hostData });
    hostResult = { message: '新增' };
  }

  // ========== 插入回放 ==========
  const replays = [
    {
      _id: 'replay_001',
      host_id: 'host_linling',
      host_slug: 'linling',
      content_type: 'live_replay',
      content_category: 'sport',
      title: '直播回放 01 — 入门跟练',
      description: '适合新用户的入门跟练，全程温和引导，零基础也能跟上。',
      cover_file_id: '',
      asset_file_id: '',
      asset_url: '',
      duration_sec: 1200,
      tags: ['入门', '跟练'],
      status: 'published',
      sort_order: 100,
      published_at: new Date(now.getTime() - 24 * 3600 * 1000),
      created_at: now,
      updated_at: now,
    },
    {
      _id: 'replay_002',
      host_id: 'host_linling',
      host_slug: 'linling',
      content_type: 'live_replay',
      content_category: 'sport',
      title: '直播回放 02 — 进阶训练',
      description: '在入门基础上加强，逐步提升运动强度，适应后效果更佳。',
      cover_file_id: '',
      asset_file_id: '',
      asset_url: '',
      duration_sec: 1800,
      tags: ['进阶', '训练'],
      status: 'published',
      sort_order: 200,
      published_at: new Date(now.getTime() - 48 * 3600 * 1000),
      created_at: now,
      updated_at: now,
    },
  ];

  const replayResults = [];
  for (const replay of replays) {
    try {
      await db.collection('content_catalog').doc(replay._id).get();
      replayResults.push({ _id: replay._id, message: '已存在' });
    } catch (e) {
      await db.collection('content_catalog').add({ data: replay });
      replayResults.push({ _id: replay._id, message: '新增' });
    }
  }

  // ========== 插入食谱 ==========
  const recipes = [
    {
      _id: 'recipe_001',
      host_id: 'host_linling',
      host_slug: 'linling',
      content_type: 'recipe',
      content_category: 'food',
      title: '一周轻食食谱',
      description: '适合日常参考的饮食搭配，营养均衡，简单易做。',
      cover_file_id: '',
      asset_file_id: '',
      asset_url: '',
      duration_sec: 0,
      tags: ['食谱', '饮食习惯'],
      status: 'published',
      sort_order: 100,
      published_at: now,
      created_at: now,
      updated_at: now,
    },
    {
      _id: 'recipe_002',
      host_id: 'host_linling',
      host_slug: 'linling',
      content_type: 'recipe',
      content_category: 'food',
      title: '运动前后饮食指南',
      description: '了解运动前后的正确饮食方式，让运动效果更好。',
      cover_file_id: '',
      asset_file_id: '',
      asset_url: '',
      duration_sec: 0,
      tags: ['食谱', '运动饮食', '体态参考'],
      status: 'published',
      sort_order: 200,
      published_at: now,
      created_at: now,
      updated_at: now,
    },
  ];

  const recipeResults = [];
  for (const recipe of recipes) {
    try {
      await db.collection('content_catalog').doc(recipe._id).get();
      recipeResults.push({ _id: recipe._id, message: '已存在' });
    } catch (e) {
      await db.collection('content_catalog').add({ data: recipe });
      recipeResults.push({ _id: recipe._id, message: '新增' });
    }
  }

  return {
    code: 0,
    message: 'ok',
    data: {
      host: hostResult,
      replays: replayResults,
      recipes: recipeResults,
    },
  };
}

async function clearData() {
  // 清理测试数据（不影响真实用户数据）
  const results = {};

  try {
    await db.collection('hosts').doc('host_linling').remove();
    results.host = '已删除';
  } catch (e) { results.host = '无需清理'; }

  for (const id of ['replay_001', 'replay_002', 'recipe_001', 'recipe_002']) {
    try {
      await db.collection('content_catalog').doc(id).remove();
      results[id] = '已删除';
    } catch (e) { results[id] = '无需清理'; }
  }

  return { code: 0, message: 'ok', data: results };
}
