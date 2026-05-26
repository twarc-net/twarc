<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\DB;

/**
 * Halal content policy enforcement.
 *
 * A post is considered NOT halal if ANY of its tags matches the blocklist.
 * Used for:
 *   1. Audit / cleanup of existing posts (waifu:halal-audit command)
 *   2. Upload validation (UploadService rejects new uploads with blocked tags)
 *   3. Import filtering (ImportFromDanbooru skips posts after fetching metadata)
 *
 * The blocklist is intentionally conservative — false-positive a borderline post
 * over admitting a problematic one.
 */
class HalalGuard
{
    /** Tags that disqualify a post from a halal-clean gallery. */
    public const BLOCKED_TAGS = [
        // -------- nudity / sexual --------
        'nude','naked','topless','bottomless','nipples','nipple','areolae','areola',
        'pussy','vagina','penis','dick','cum','semen','fluid','anus','clitoris',
        'cum_on_body','cum_in_mouth','cum_on_breasts','cum_on_face',

        // breasts (any visibility) — Danbooru tags these aggressively
        'breasts','large_breasts','medium_breasts','small_breasts','huge_breasts','gigantic_breasts',
        'flat_chest','breasts_apart','breasts_out','breasts_squeezed_together','between_breasts',
        'breast_grab','breast_press','breasts_in_doorway',
        'nipple_slip','nip_slip','oppai','paizuri','breasts_focus',

        // butt / pelvis
        'ass','butt','butt_focus','ass_focus','ass_visible_through_thighs','huge_ass','large_ass',
        'bare_butt','bottom_visible','ass_grab',

        // -------- exposed body --------
        'cleavage','sideboob','underboob','side_boob','under_boob','areola_slip',
        'bare_arms','bare_legs','bare_shoulders','bare_back','bare_thighs','bare_midriff',
        'bare_hips','bare_chest','bare_pectorals',
        'midriff','navel','navel_focus','stomach','crop_top',
        'thighs','thigh_gap','thick_thighs','thighhighs_pull','thigh_focus',
        'exposed_armpits','armpit','armpits','armpit_focus',
        'spread_legs','m_legs','open_legs','legs_apart',
        'cameltoe','toe_cleavage','bare_feet','barefoot',
        'shirt_lift','dress_lift','skirt_lift','panty_pull','clothing_aside',

        // -------- revealing clothing --------
        'swimsuit','bikini','micro_bikini','school_swimsuit','one-piece_swimsuit','slingshot_swimsuit',
        'string_bikini','bikini_top','bikini_bottom','side-tie_bikini','frilled_bikini','jacket_swimsuit',
        'competition_swimsuit','swim_briefs',
        'panties','underwear','lingerie','bra','no_bra','sports_bra','panty_shot','pantyshot',
        'see-through','transparent','transparent_clothing','wet_clothes','wet_shirt','transparent_when_wet',
        'low-cut','deep_cleavage','plunging_neckline','open_clothes','unbuttoned',
        'short_shorts','hot_pants','very_short_shorts',
        'microskirt','micro_skirt',
        'tube_top','halter_top','bandeau','off-shoulder','off_shoulder',
        'leotard','high_leg_leotard','playboy_bunny','bunnysuit','bunny_girl',
        'nightgown','nightie','negligee','babydoll','chemise','garter_belt','garter_straps',
        'lifted_by_self','clothes_pull','dress_pull','undressing','partially_undressed',
        'naked_apron','naked_shirt','naked_towel','towel','wet_towel',

        // -------- suggestive acts --------
        'kissing','french_kiss','kiss','tongue_kiss','open-mouth_kiss',
        'yuri','yaoi','girls_holding_hands_kissing','hetero',
        'bath','bathing','in_bath','bathtub','bathing_together','onsen','hot_spring','bathhouse',
        'on_bed','in_bed','bed_sheet','lying_on_bed','sheets',
        'masturbation','sex','sex_from_behind','sexual','vaginal','anal','oral',
        'ahegao','drooling','tongue_out','saliva','saliva_trail','mouth_drool',
        'blush_(sexual)','aroused','suggestive','seductive_smile','bedroom_eyes','heart-shaped_pupils',
        'embarrassed','flustered_face','hand_on_own_breast','grabbing_own_breast',
        'sweat_drop','sweating','heavy_breathing',
        'erection','bulge','pantyhose_pull',

        // -------- meta NSFW signals --------
        'ecchi','fanservice','hentai','nsfw','erotic','r-18','r18','adult',

        // -------- themes incompatible with halal --------
        'alcohol','beer','wine','sake','cocktail','drunk','drinking_alcohol','bottle_of_alcohol',
        'wine_glass','beer_mug','sake_bottle','sake_cup',
        'cigarette','smoking','vape','vaping','cigar','tobacco',
        'gambling','casino','poker','mahjong','slot_machine','dice',
        'pig','pigs','pork',  // dietary
        'gore','blood','bloody','injury','disturbing','horror','guro',
    ];

    /** @return int[] Numeric tag IDs corresponding to the blocklist (cached per request). */
    public function blockedTagIds(): array
    {
        static $cached = null;
        if ($cached !== null) return $cached;
        $cached = DB::table('tags')
            ->whereIn('name', self::BLOCKED_TAGS)
            ->pluck('id')
            ->all();
        return $cached;
    }

    /** Check a post by its tag_ids array against the blocklist. */
    public function isHaramByTagIds(array $tagIds): bool
    {
        $blocked = $this->blockedTagIds();
        return !empty(array_intersect($tagIds, $blocked));
    }

    /** Check a raw tag string (space-separated lowercase). */
    public function isHaramByTagString(string $tagString): bool
    {
        $tags = preg_split('/\s+/', strtolower(trim($tagString))) ?: [];
        $blocked = array_flip(self::BLOCKED_TAGS);
        foreach ($tags as $t) {
            if (isset($blocked[$t])) return true;
        }
        return false;
    }

    /** Which specific blocked tags does this string contain (for reporting). */
    public function offendingTags(string $tagString): array
    {
        $tags = preg_split('/\s+/', strtolower(trim($tagString))) ?: [];
        $blocked = array_flip(self::BLOCKED_TAGS);
        return array_values(array_filter($tags, fn ($t) => isset($blocked[$t])));
    }
}
