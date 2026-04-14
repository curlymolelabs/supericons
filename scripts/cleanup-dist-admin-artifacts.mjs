import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const workspaceRoot = process.cwd();
const publishAdminUi = process.env.PUBLISH_ADMIN_UI?.trim() === 'true';

if (!publishAdminUi) {
  await Promise.all([
    rm(resolve(workspaceRoot, 'dist', 'admin.html'), { force: true }),
    rm(resolve(workspaceRoot, 'dist', 'admin-app.js'), { force: true }),
    rm(resolve(workspaceRoot, 'dist', '_headers'), { force: true }),
  ]);

  console.log('Removed admin artifacts from production dist output.');
} else {
  console.log('PUBLISH_ADMIN_UI=true, keeping admin artifacts in dist.');
}
