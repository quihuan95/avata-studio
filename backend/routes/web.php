<?php

use Illuminate\Support\Facades\Route;

Route::fallback(function () {
    $frontend = public_path('index.html');

    abort_unless(file_exists($frontend), 503, 'Frontend has not been built yet.');

    return response()->file($frontend);
});
