<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Make the comments table dual-purpose: a comment belongs to EXACTLY ONE of
 * (image post, blog post). Reuses every other column + the threaded parent_id
 * + the moderation/score/soft-delete plumbing instead of cloning a table.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. New nullable FK to blog_posts.
        Schema::table('comments', function (Blueprint $t) {
            $t->foreignId('blog_post_id')->nullable()->after('post_id')
              ->constrained('blog_posts')->cascadeOnDelete();
        });

        // 2. Allow post_id to be null (so blog-only comments are valid).
        DB::statement('ALTER TABLE comments ALTER COLUMN post_id DROP NOT NULL');

        // 3. Exactly-one constraint so a row can't reference both or neither.
        DB::statement('ALTER TABLE comments ADD CONSTRAINT comments_one_target
            CHECK ((post_id IS NOT NULL)::int + (blog_post_id IS NOT NULL)::int = 1)');

        // 4. Lookup index for blog-side reads.
        DB::statement('CREATE INDEX idx_comments_blog ON comments (blog_post_id, created_at DESC)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_comments_blog');
        DB::statement('ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_one_target');
        DB::statement('ALTER TABLE comments ALTER COLUMN post_id SET NOT NULL');
        Schema::table('comments', function (Blueprint $t) {
            $t->dropConstrainedForeignId('blog_post_id');
        });
    }
};
