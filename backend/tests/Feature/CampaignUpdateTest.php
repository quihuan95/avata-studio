<?php

namespace Tests\Feature;

use App\Models\Campaign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampaignUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_a_campaign_without_replacing_its_frame(): void
    {
        config([
            'app.key' => 'campaign-update-test-key',
            'services.frame_admin_username' => 'admin',
            'services.frame_admin_password_hash' => 'test-password-hash',
        ]);

        $campaign = Campaign::create([
            'name' => 'Old name',
            'subtitle' => 'Old subtitle',
            'slug' => 'old-slug',
            'frame_path' => 'frames/original.png',
            'active' => true,
        ]);
        $token = hash_hmac(
            'sha256',
            'admin|test-password-hash',
            'campaign-update-test-key',
        );

        $response = $this->withToken($token)->postJson("/api/admin/campaigns/{$campaign->id}", [
            'name' => 'New name',
            'subtitle' => 'New subtitle',
            'slug' => 'new-slug',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.name', 'New name')
            ->assertJsonPath('data.slug', 'new-slug');
        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'name' => 'New name',
            'subtitle' => 'New subtitle',
            'slug' => 'new-slug',
            'frame_path' => 'frames/original.png',
        ]);
    }
}
