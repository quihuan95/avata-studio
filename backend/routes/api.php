<?php

use App\Http\Controllers\CampaignController;
use Illuminate\Support\Facades\Route;

Route::get('/campaigns', [CampaignController::class, 'index']);
Route::get('/campaigns/{slug}', [CampaignController::class, 'show']);
Route::post('/campaigns/{slug}/view', [CampaignController::class, 'view']);
Route::post('/campaigns/{slug}/download', [CampaignController::class, 'download']);
Route::middleware('throttle:5,1')->post('/admin/login', [CampaignController::class, 'login']);
Route::middleware('throttle:30,1')->group(function () {
    Route::get('/admin/check', [CampaignController::class, 'check']);
    Route::post('/admin/campaigns', [CampaignController::class, 'store']);
    Route::post('/admin/campaigns/{campaign}', [CampaignController::class, 'update']);
    Route::delete('/admin/campaigns/{campaign}', [CampaignController::class, 'destroy']);
});
