# Deploy on aaPanel

The production site uses one domain: Laravel serves `/api/*`, while the React build serves all website routes including `/admin`.

## 1. Prepare the application

On the server, install PHP 8.2 or newer with SQLite (or configure MySQL), Composer, and Node.js 20 or newer.

Build the frontend against the same-domain API:

```bash
cd web
npm ci
VITE_API_BASE_URL=/api npm run build
cp -R dist/. ../backend/public/
```

Prepare Laravel:

```bash
cd ../backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

Set production values in `backend/.env`, particularly `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`, database settings, `ADMIN_USERNAME`, and `ADMIN_PASSWORD_HASH`. Generate a password hash with `php -r "echo password_hash('your-password', PASSWORD_DEFAULT);"`; never store the plain password in `.env`.

## 2. Configure the aaPanel website

- Website root: the absolute path to `backend/public`.
- PHP version: 8.2 or newer.
- Do not expose the `backend` project root.
- Enable HTTPS.

Use these Nginx route rules inside the website server block:

```nginx
location /api/ {
    try_files $uri $uri/ /index.php?$query_string;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

Keep aaPanel's generated PHP handler for `index.php`. Ensure the PHP user can write to `backend/storage` and `backend/bootstrap/cache`.

## 3. Updating the site

After frontend changes, rebuild and copy `web/dist` into `backend/public`. After backend configuration or route changes, clear and rebuild Laravel caches:

```bash
cd backend
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
```
