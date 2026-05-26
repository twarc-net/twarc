<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('badges', function (Blueprint $table) {
            // Identifier of the rule in AchievementService::RULES — null means manual award.
            $table->string('criteria_rule', 50)->nullable()->after('is_auto');
            // Threshold or extra parameter for the rule (e.g. 100 for "100 approved posts").
            $table->integer('criteria_value')->nullable()->after('criteria_rule');
        });
    }

    public function down(): void
    {
        Schema::table('badges', function (Blueprint $table) {
            $table->dropColumn(['criteria_rule', 'criteria_value']);
        });
    }
};
