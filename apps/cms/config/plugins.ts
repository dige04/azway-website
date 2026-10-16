import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedTypes = [
  'image/svg+xml',
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const R2_VARS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
] as const;

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  // Upload to Cloudflare R2 only when every R2_* variable is set; otherwise
  // Strapi's default local provider writes to public/uploads.
  const useR2 = R2_VARS.every((name) => Boolean(env(name)));

  return {
    'users-permissions': {
      config: {
        jwtManagement: 'refresh',
        sessions: {
          httpOnly: true,
        },
      },
    },
    upload: {
      config: {
        ...(useR2 && {
          provider: 'aws-s3',
          providerOptions: {
            baseUrl: env('R2_PUBLIC_URL'),
            s3Options: {
              credentials: {
                accessKeyId: env('R2_ACCESS_KEY_ID'),
                secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
              },
              endpoint: `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
              region: 'auto',
              params: {
                Bucket: env('R2_BUCKET'),
                // R2 has no object ACLs; an explicit undefined stops the
                // provider from sending its default `public-read`.
                ACL: undefined,
              },
            },
          },
          actionOptions: {
            upload: {},
            uploadStream: {},
            delete: {},
          },
        }),
        security: {
          allowedTypes: allowedMediaTypes,
          deniedTypes,
        },
      },
    },
  };
};

export default config;
