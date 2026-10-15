<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;

class CampaignController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Campaign::where('active', true)->latest()->get()]);
    }

    public function show(string $slug)
    {
        return response()->json(['data' => Campaign::where('slug', $slug)->where('active', true)->firstOrFail()]);
    }

    public function view(string $slug)
    {
        $campaign = Campaign::where('slug', $slug)->where('active', true)->firstOrFail();
        $campaign->increment('views');

        return response()->json(['ok' => true]);
    }

    public function download(string $slug)
    {
        $campaign = Campaign::where('slug', $slug)->where('active', true)->firstOrFail();
        $campaign->increment('downloads');

        return response()->json(['ok' => true]);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate(['username' => ['required', 'string', 'max:100'], 'password' => ['required', 'string', 'max:255']]);
        if (! $this->validCredentials($credentials['username'], $credentials['password'])) {
            abort(403, 'Invalid credentials');
        }

        return response()->json(['access_token' => $this->permanentToken()]);
    }

    public function check(Request $request)
    {
        $this->guard($request);

        return response()->json(['ok' => true]);
    }

    public function store(Request $request)
    {
        $this->guard($request);
        $data = $request->validate(['name' => 'required|string|max:150', 'subtitle' => 'nullable|string|max:255', 'slug' => 'required|alpha_dash|max:120|unique:campaigns,slug', 'frame' => 'required_without:frame_url|file|mimes:png,svg|max:5120', 'frame_url' => 'required_without:frame|url|starts_with:https://']);
        if ($request->hasFile('frame')) {
            $path = $request->file('frame')->store('frames', 'public');
        } else {
            $path = $data['frame_url'];
            if (! str_starts_with($path, 'https://')) {
                abort(422, 'Frame URL must use HTTPS');
            }
        }
        $campaign = Campaign::create(['name' => $data['name'], 'subtitle' => $data['subtitle'] ?? '', 'slug' => $data['slug'], 'frame_path' => $path, 'active' => true]);

        return response()->json(['data' => $campaign], 201);
    }

    public function destroy(Request $request, Campaign $campaign)
    {
        $this->guard($request);
        if (! str_starts_with($campaign->frame_path, 'https://')) {
            Storage::disk('public')->delete($campaign->frame_path);
        }
        $campaign->delete();

        return response()->json(['ok' => true]);
    }

    private function guard(Request $request): void
    {
        $token = (string) $request->bearerToken();
        if ($token === '' || ! hash_equals($this->permanentToken(), $token)) {
            abort(403, 'Invalid admin token');
        }
    }

    private function permanentToken(): string
    {
        $username = (string) config('services.frame_admin_username');
        $passwordHash = (string) config('services.frame_admin_password_hash');

        return hash_hmac('sha256', $username.'|'.$passwordHash, (string) config('app.key'));
    }

    private function validCredentials(string $username, string $password): bool
    {
        $expectedUsername = (string) config('services.frame_admin_username');
        $passwordHash = (string) config('services.frame_admin_password_hash');

        return $expectedUsername !== ''
            && $passwordHash !== ''
            && hash_equals($expectedUsername, $username)
            && password_verify($password, $passwordHash);
    }
}
