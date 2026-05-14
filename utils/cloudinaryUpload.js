import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';

let appliedConfig = false;

/**
 * Parse `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`
 * Uses last `@` so secrets containing `@` (URL-encoded as %40) still work when properly encoded.
 */
function parseCloudinaryUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed || !trimmed.startsWith('cloudinary://')) return null;

  const withoutScheme = trimmed.slice('cloudinary://'.length);
  const atIdx = withoutScheme.lastIndexOf('@');
  if (atIdx === -1) return null;

  const cloudPart = withoutScheme.slice(atIdx + 1).split('/')[0].split('?')[0];
  const credPart = withoutScheme.slice(0, atIdx);
  const colonIdx = credPart.indexOf(':');
  if (colonIdx === -1) return null;

  const api_key = credPart.slice(0, colonIdx).trim();
  const api_secret = credPart.slice(colonIdx + 1).trim();
  const cloud_name = cloudPart.trim();

  if (!api_key || !api_secret || !cloud_name) return null;

  try {
    return {
      cloud_name: decodeURIComponent(cloud_name),
      api_key: decodeURIComponent(api_key),
      api_secret: decodeURIComponent(api_secret),
    };
  } catch {
    return null;
  }
}

function getCredentialsFromEnv() {
  const cn = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (cn && key && secret) {
    return { cloud_name: cn, api_key: key, api_secret: secret };
  }
  return parseCloudinaryUrl(process.env.CLOUDINARY_URL);
}

export function isCloudinaryConfigured() {
  return getCredentialsFromEnv() !== null;
}

function ensureCloudinaryConfigured() {
  const creds = getCredentialsFromEnv();
  if (!creds) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_URL (cloudinary://KEY:SECRET@CLOUD_NAME) or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  if (!appliedConfig) {
    cloudinary.config({
      cloud_name: creds.cloud_name,
      api_key: creds.api_key,
      api_secret: creds.api_secret,
      secure: true,
    });
    appliedConfig = true;
  }
}

/**
 * Upload a single image buffer to Cloudinary (folder = dynamic path per merchant/product).
 */
export async function uploadImageBuffer(buffer, folder) {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error('Cloudinary returned no URL'));
          return;
        }
        resolve(result.secure_url);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}
