const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('dottDesktop', {
  platform: process.platform,
  isDesktop: true,
});
