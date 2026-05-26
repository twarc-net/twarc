<?php

return [
    // Same-origin in prod, but kept open for the small set of paths the SPA hits cross-origin
    // (none right now — leaving in case Next.js dev later runs on a separate port)
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'auth/*',
                'user/profile-information', 'user/password',
                'email/verification-notification', 'verify-email/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://twarc.net',
        'https://www.twarc.net',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
