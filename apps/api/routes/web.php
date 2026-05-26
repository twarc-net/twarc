<?php

use Illuminate\Support\Facades\Route;

// Named 'login' route — required by Authenticate middleware's redirectGuestRoute().
// We always return JSON 401 since this is an API-only backend (Next.js serves all HTML).
Route::any('/login', fn () => response()->json(['message' => 'Unauthenticated.'], 401))
    ->name('login');
