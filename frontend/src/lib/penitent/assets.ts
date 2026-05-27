const bundleBase = "/pntnt2/assets/pntn2_bundle";
const referenceCrops = `${bundleBase}/01_reference_extractions/pntn2_key_element_crops`;
const batch02 = `${bundleBase}/03_generated_assets_batch02`;
const separated = `${bundleBase}/04_crusader_instrument_separated`;
const optimized = `${bundleBase}/05_optimized_runtime`;

export const penitentAssetPaths = {
  mockups: {
    multiplayer: `${bundleBase}/00_mockups/01_multiplayer_mockup.png`,
    singlePlayer: `${bundleBase}/00_mockups/02_single_player_mockup.png`,
    resurrection: `${bundleBase}/00_mockups/03_resurrection_mockup.png`,
  },
  scene: {
    battlefield: `${batch02}/22_battlefield_demon_army_wide_strip.png`,
    mountainLeft: `${referenceCrops}/07_left_mountain_base.png`,
    mountainRight: `${referenceCrops}/08_right_mountain_base.png`,
    volcano: `${batch02}/21_volcano_small_smoking.png`,
    flagMountain: `${batch02}/20_mountain_small_flag.png`,
    cloudWide: `${batch02}/24_cloud_cluster_wide.png`,
    cloudSmall: `${batch02}/25_cloud_cluster_small.png`,
    cloudRight: `${batch02}/26_cloud_cluster_right.png`,
    lightningBolts: `${batch02}/19_lightning_bolts_blue_four.png`,
    fireballs: `${batch02}/18_projectile_fireballs_three.png`,
  },
  crusaders: {
    keyboardClean: `${optimized}/01_crusader_keyboard_left_large_clean.png`,
    guitarClean: `${optimized}/02_crusader_guitar_left_large_clean.png`,
    keyboardRightClean: `${optimized}/03_crusader_keyboard_right_large_clean.png`,
    bodyDefensive: `${separated}/01_crusader_body_defensive.png`,
    bodyDramatic: `${separated}/02_crusader_body_dramatic.png`,
    bodyPerformer: `${separated}/03_crusader_body_performer.png`,
    bodyOrnate: `${separated}/04_crusader_body_ornate.png`,
    keyboardA: `${separated}/05_keyboard_variant_a.png`,
    keyboardB: `${separated}/06_keyboard_variant_b.png`,
    guitarA: `${separated}/07_guitar_variant_a.png`,
    guitarBass: `${separated}/08_guitar_variant_bass.png`,
  },
  heart: {
    large: `${batch02}/05_heart_large_with_waveform.png`,
    frames: [
      `${batch02}/06_heart_small_frame_01.png`,
      `${batch02}/07_heart_small_frame_02.png`,
      `${batch02}/08_heart_small_frame_03.png`,
      `${batch02}/09_heart_small_frame_04.png`,
      `${batch02}/10_heart_small_frame_05.png`,
    ],
  },
  dragons: {
    largeLeft: `${batch02}/11_dragon_large_left_fire.png`,
    largeRight: `${batch02}/12_dragon_large_right_fire.png`,
    smallLeft: `${batch02}/13_dragon_small_hover_left.png`,
    smallMid: `${batch02}/14_dragon_small_hover_mid.png`,
    mediumFire: `${batch02}/15_dragon_medium_fire.png`,
    lowLeft: `${batch02}/16_dragon_low_flame_left.png`,
    lowRight: `${batch02}/17_dragon_low_flame_right.png`,
  },
  demons: {
    trident: `${batch02}/27_demon_trident_soldier.png`,
    axe: `${batch02}/28_demon_axe_soldier.png`,
    head: `${batch02}/29_demon_head_icon.png`,
    beast: `${batch02}/30_demon_beast_fireball.png`,
    hand: `${batch02}/31_demon_raised_hand.png`,
  },
  hud: {
    p1Health: `${batch02}/32_hud_p1_health_meter.png`,
    p1Energy: `${batch02}/33_hud_p1_energy_meter.png`,
    p2Health: `${batch02}/34_hud_p2_health_meter.png`,
    p2Energy: `${batch02}/35_hud_p2_energy_meter.png`,
    p1Seal: `${batch02}/36_ornate_frame_p1_blue_cross.png`,
    p2Seal: `${batch02}/37_ornate_frame_p2_orange_cross.png`,
    noteTrack: `${batch02}/38_rhythm_note_track_panel.png`,
    comboPanel: `${batch02}/43_combo_panel_124.png`,
    songTitle: `${batch02}/48_song_title_plate_infernal_march.png`,
    songProgress: `${batch02}/49_song_progress_bar.png`,
  },
  abilities: {
    lightning: `${batch02}/40_ability_card_p1_lightning.png`,
    burst: `${batch02}/41_ability_card_p1_burst.png`,
    shield: `${batch02}/42_ability_card_p1_shield.png`,
    flame: `${batch02}/45_ability_card_p2_fire.png`,
    skull: `${batch02}/46_ability_card_p2_demon.png`,
    meteor: `${batch02}/47_ability_card_p2_meteor.png`,
  },
} as const;

export const penitentRuntimeAssets = [
  penitentAssetPaths.scene.battlefield,
  penitentAssetPaths.scene.mountainLeft,
  penitentAssetPaths.scene.mountainRight,
  penitentAssetPaths.scene.volcano,
  penitentAssetPaths.scene.flagMountain,
  penitentAssetPaths.scene.cloudWide,
  penitentAssetPaths.scene.cloudSmall,
  penitentAssetPaths.scene.cloudRight,
  penitentAssetPaths.scene.lightningBolts,
  penitentAssetPaths.scene.fireballs,
  penitentAssetPaths.crusaders.keyboardClean,
  penitentAssetPaths.crusaders.guitarClean,
  penitentAssetPaths.heart.large,
  ...penitentAssetPaths.heart.frames,
  ...Object.values(penitentAssetPaths.dragons),
  ...Object.values(penitentAssetPaths.demons),
  ...Object.values(penitentAssetPaths.hud),
  ...Object.values(penitentAssetPaths.abilities),
];

export type PenitentAbilityAssetId = keyof typeof penitentAssetPaths.abilities;
