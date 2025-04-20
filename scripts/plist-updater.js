#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { processAllPlists } = require('./plist-utils');
const { updateHashFile, getCurrentHashes } = require('./github-api');

// Cấu hình
const CONFIG = {
  PLIST_MAPPINGS: {
    'https://file.jb-apps.me/plist/Unc0ver.plist': 'static/plist/unc0ver.plist',
    'https://file.jb-apps.me/plist/DopamineJB.plist': 'static/plist/dopamine.plist',
    'https://file.jb-apps.me/plist/XinaA15.plist': 'static/plist/xinaa15.plist',
    'https://file.jb-apps.me/plist/PhoenixJB.plist': 'static/plist/phoenix.plist',
    'https://file.jb-apps.me/plist/Unc0ver_old.plist': 'static/plist/unc0ver_6.1.2.plist',
    'https://file.jb-apps.me/plist/FilzaEscaped15.plist': 'static/plist/filzaescaped15.plist',
    'https://file.jb-apps.me/plist/Taurine.plist': 'static/plist/taurine.plist',
    'https://file.jb-apps.me/plist/NekoJB.plist': 'static/plist/neko.plist',
    'https://file.jb-apps.me/plist/ChimeraJB.plist': 'static/plist/chimera.plist',
    'https://file.jb-apps.me/plist/OdysseyJB.plist': 'static/plist/odyssey.plist',
    'https://file.jb-apps.me/plist/Freya.plist': 'static/plist/freya.plist'
  },
  HASH_FILE: 'static/plist_hashes.json',
  GITHUB_REPO: 'chienlove/chienlove.github.io',
  GITHUB_BRANCH: 'main'
};

async function main() {
  const forceUpdate = process.argv.includes('--force');
  const startTime = new Date();
  
  try {
    const currentHashes = await getCurrentHashes();
    const { results, updatedHashes } = await processAllPlists(CONFIG.PLIST_MAPPINGS, currentHashes, forceUpdate);
    
    if (Object.keys(updatedHashes).length > 0) {
      await updateHashFile(updatedHashes);
    }

    printSummary(results, startTime);
    process.exit(0);
  } catch (error) {
    console.error('❌ Critical error:', error.message);
    process.exit(1);
  }
}

function printSummary(results, startTime) {
  const changed = results.filter(r => r.updated).length;
  const errors = results.filter(r => r.error).length;
  const duration = ((new Date() - startTime) / 1000).toFixed(2);
  
  console.log('SUMMARY:', `Checked ${results.length} plists in ${duration}s. ` +
    `Updated: ${changed}, Errors: ${errors}`);
  console.log('CHANGED:', changed);
  console.log('ERRORS:', errors);
}

main();