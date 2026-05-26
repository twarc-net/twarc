<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\UpdateUserPassword;
use App\Actions\Fortify\UpdateUserProfileInformation;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::updateUserProfileInformationUsing(UpdateUserProfileInformation::class);
        Fortify::updateUserPasswordsUsing(UpdateUserPassword::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);

        // Login by email OR username
        Fortify::authenticateUsing(function (Request $request) {
            $login = $request->input('login') ?? $request->input('email');
            if (! $login) {
                return null;
            }

            $field = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';
            $user  = User::where($field, $login)->first();

            if ($user && Hash::check((string) $request->input('password'), $user->password)) {
                return $user;
            }

            return null;
        });

        RateLimiter::for('login', function (Request $request) {
            $key = (string) ($request->input('login') ?? $request->input('email') ?? $request->ip());
            $throttleKey = Str::transliterate(Str::lower($key) . '|' . $request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('passkeys', function (Request $request) {
            $credentialId = $request->input('credential.id');
            return Limit::perMinute(10)->by(
                ($credentialId ?: $request->session()->getId()) . '|' . $request->ip()
            );
        });

        // Additional limiters — wired into routes/api.php
        RateLimiter::for('register', function (Request $request) {
            return Limit::perHour(5)->by($request->ip())
                ->response(fn () => response()->json(['message' => 'Too many signups from this IP. Try later.'], 429));
        });

        RateLimiter::for('upload', function (Request $request) {
            // Authenticated users: 30 uploads/hour
            return $request->user()
                ? Limit::perHour(30)->by('upload:' . $request->user()->id)
                : Limit::perMinute(1)->by($request->ip());
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by(optional($request->user())->id ?: $request->ip());
        });
    }
}
