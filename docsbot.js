// Shared DocsBot widget for the public website.
(() => {
  window.DocsBotAI = window.DocsBotAI || {};
  window.DocsBotAI.init = function (options) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://widget.docsbot.ai/chat.js';
      script.addEventListener('load', () => {
        Promise.resolve()
          .then(() => window.DocsBotAI.mount(Object.assign({}, options)))
          .then(resolve, reject);
      });
      script.addEventListener('error', () => {
        reject(new Error('DocsBot widget could not be loaded.'));
      });
      document.head.appendChild(script);
    });
  };

  window.DocsBotAI.init({
    id: 'MV9Vv7R0CudGLXiEb3LY/Xs8Ct4Yuuoac68NrEl9W',
  }).catch(error => {
    console.warn('AI 聊天機器人暫時無法載入：', error);
  });
})();
