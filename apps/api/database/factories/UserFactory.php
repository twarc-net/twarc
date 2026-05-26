<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        $username = fake()->unique()->userName();

        return [
            'username'          => $username,
            'email'             => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password'          => static::$password ??= Hash::make('password'),
            'remember_token'    => Str::random(10),
            'display_name'      => fake()->name(),
            'role'              => 'member',
            'show_questionable' => false,
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn () => ['email_verified_at' => null]);
    }

    public function moderator(): static
    {
        return $this->state(fn () => ['role' => 'moderator']);
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => 'admin']);
    }
}
