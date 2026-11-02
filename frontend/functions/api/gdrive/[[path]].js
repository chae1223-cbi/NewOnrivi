import { handleDriveOAuth } from './_oauth.js';

export const onRequest = ({ request, env }) => handleDriveOAuth(request, env);
