<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->string('slug', 200)->unique();
            $table->string('title', 200);
            $table->text('excerpt')->nullable();
            $table->longText('body'); // Markdown source
            $table->string('cover_url', 500)->nullable();
            $table->enum('status', ['draft', 'pending', 'published'])->default('pending');
            $table->timestampTz('published_at')->nullable();
            $table->unsignedBigInteger('view_count')->default(0);
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['status', 'published_at']);
            $table->index(['author_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};
