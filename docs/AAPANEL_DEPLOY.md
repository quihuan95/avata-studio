# Deploy on aaPanel

The production site uses one domain: Laravel serves `/api/*`, while the React build serves all website routes including `/admin`.

## 1. Prepare the application

On the server, install PHP 8.2 or newer with the `pdo_mysql`, `mbstring`, `fileinfo`, and `openssl` extensions, plus Composer and Node.js 20 or newer.

Create a MySQL database in **aaPanel → Databases → Add database**. Use a dedicated database and user, for example `avatar_studio`, and keep the generated password.

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
cp .env.example .env
php artisan key:generate
```

Before migrating, set the production values in `backend/.env`:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=avatar_studio
DB_USERNAME=avatar_studio
DB_PASSWORD=your-aaPanel-database-password

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH='$2y$...'
```

Generate the admin password hash with `php -r "echo password_hash('your-password', PASSWORD_DEFAULT), PHP_EOL;"`; never store the plain admin password in `.env`. After saving the MySQL settings, finish Laravel setup:

```bash
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

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
