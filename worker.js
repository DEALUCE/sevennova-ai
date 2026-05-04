import { onRequestPost } from './functions/api/zoning.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/zoning') {
      const context = { request, env, ctx };
      if (request.method === 'POST') return onRequestPost(context);
      return new Response('Method not allowed', { status: 405 });
    }

    return env.ASSETS.fetch(request);
  },
};
