<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * @param  array<string, string>  $input
     * @throws ValidationException
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'username' => [
                'required', 'string',
                'min:3', 'max:30',
                'regex:/^[a-zA-Z0-9_]+$/',
                Rule::unique(User::class, 'username'),
            ],
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique(User::class, 'email'),
            ],
            'display_name' => ['nullable', 'string', 'max:80'],
            'password' => $this->passwordRules(),
        ], [
            'username.regex' => 'Username may only contain letters, numbers, and underscores.',
        ])->validate();

        // Use forceFill for `role` since it's intentionally not Fillable (mass-assignment hardening).
        return tap(User::create([
            'username'     => $input['username'],
            'email'        => $input['email'],
            'display_name' => $input['display_name'] ?? $input['username'],
            'password'     => Hash::make($input['password']),
        ]), function (User $u) {
            $u->forceFill(['role' => 'member'])->save();
        });
    }
}
