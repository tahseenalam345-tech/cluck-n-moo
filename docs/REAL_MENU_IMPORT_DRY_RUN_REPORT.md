# Cluck N Moo (CNM) Real Menu Database Import Report

> **Execution Timestamp**: 2026-09-23T13:22:52.119Z  
> **Execution Mode**: **LIVE DATABASE COMMIT**  
> **Database File**: `data/cnm.db`  
> **Backup Location**: `E:\Projects\Cluck n moo\data\backups\cnm_pre_menu_import_20260923132252.db`  
> **Source Documents**: `docs/VERIFIED_CNM_MENU_EXTRACTION.md`, `docs/CLOUDINARY_MENU_MAPPING_REPORT.md`, `docs/REAL_MENU_DATABASE_IMPORT_PLAN.md`

---

## 1. Summary Metrics & Statistics

| Metric | Pre-Import DB State | Post-Import DB State | Net Change |
| :--- | :--- | :--- | :--- |
| **Active Categories** | 6 | 14 | +8 |
| **Active Real Products** | 16 | 74 | +58 |
| **Archived Starter Items** | 0 | 16 | +16 (Available=0) |
| **Active Product Variants** | 13 | 48 | +35 |
| **Modifier Groups** | 3 | 33 | +30 |
| **Modifier Options** | 6 | 157 | +151 |
| **Synced Cloudinary Images** | 0 | 64 | +64 |
| **Missing Image Products** | - | 10 | - |
| **Duplicate Assets Excluded** | - | 1 (`cookie_skillet_2_r8an6w`) | - |
| **Historical Orders** | 12 | 12 (Protected) | 0 (No data loss) |

---

## 2. Categories Table (14)

| Category ID | Name | Slug | Display Order | Action |
| :--- | :--- | :--- | :--- | :--- |
| `cat_beef_burgers` | **Beef Burgers with Cheese** | `beef-burgers` | 1 | **CREATE** |
| `cat_chicken_burgers` | **Chicken Burgers with Cheese** | `chicken-burgers` | 2 | **CREATE** |
| `cat_appetizers` | **Appetizers & Fried Chicken** | `appetizers` | 3 | **CREATE** |
| `cat_fries_more` | **Fries N More** | `fries-more` | 4 | **CREATE** |
| `cat_wraps` | **Crunchwraps & Tortilla Wraps** | `wraps` | 5 | **CREATE** |
| `cat_sandwiches` | **Sandwiches** | `sandwiches` | 6 | **CREATE** |
| `cat_pizzas` | **Artisan Round Pizzas** | `pizzas` | 7 | **RETAIN** |
| `cat_pizza_specials` | **Signature Pizza Specials** | `pizza-specials` | 8 | **CREATE** |
| `cat_pasta_sides` | **Pastas & Oven Sides** | `pastas-sides` | 9 | **CREATE** |
| `cat_box_deals` | **Box Deals** | `box-deals` | 10 | **CREATE** |
| `cat_combo_deals` | **Numbered Combo Deals** | `combo-deals` | 11 | **CREATE** |
| `cat_student_deals` | **Student Offers** | `student-offers` | 12 | **CREATE** |
| `cat_desserts` | **Desserts** | `desserts` | 13 | **CREATE** |
| `cat_drinks` | **Drinks & Chillers** | `drinks` | 14 | **RETAIN** |

---

## 3. Products & Image Sync Table (74)

| Category | Product Name | Slug | Base Price | Image Status | Cloudinary Public ID | Delivery URL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Beef Burgers with Cheese | **The OG** | `the-og-burger` | 730 PKR | **SAFE** | `the_og_aigens` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/the_og_aigens) |
| Beef Burgers with Cheese | **Classic Cheeseburger** | `classic-cheeseburger` | 620 PKR | **SAFE** | `classic_cheeseburger_fwnokj` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/classic_cheeseburger_fwnokj) |
| Beef Burgers with Cheese | **Oklahoma Smash** | `oklahoma-smash-burger` | 670 PKR | **SAFE** | `oklahoma_wzcypj` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/oklahoma_wzcypj) |
| Beef Burgers with Cheese | **Mushroom n Swiss** | `mushroom-n-swiss-burger` | 740 PKR | **SAFE** | `mushroom_n_swiss_sgd3ct` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/mushroom_n_swiss_sgd3ct) |
| Beef Burgers with Cheese | **Philly CheeseSteak** | `philly-cheesesteak` | 750 PKR | **SAFE** | `philly_cheesestack_un02hn` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/philly_cheesestack_un02hn) |
| Chicken Burgers with Cheese | **Original Xinger** | `original-xinger-burger` | 450 PKR | **SAFE** | `original_xinger_gdemnd` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/original_xinger_gdemnd) |
| Chicken Burgers with Cheese | **Nashville Hot** | `nashville-hot-burger` | 590 PKR | **SAFE** | `nashville_hot_ahgt9q` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/nashville_hot_ahgt9q) |
| Chicken Burgers with Cheese | **Citrus Honey Crunch** | `citrus-honey-crunch-burger` | 590 PKR | **SAFE** | `citrus_honey_crush_rcslnq` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/citrus_honey_crush_rcslnq) |
| Chicken Burgers with Cheese | **Smashin' Cluck** | `smashin-cluck-burger` | 490 PKR | **SAFE** | `smashin_cluck_zcyqml` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/smashin_cluck_zcyqml) |
| Chicken Burgers with Cheese | **Smoky BBQ** | `smoky-bbq-burger` | 570 PKR | **SAFE** | `smoky_bbq_woq6kt` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/smoky_bbq_woq6kt) |
| Chicken Burgers with Cheese | **Clucky Patty** | `clucky-patty-burger` | 420 PKR | **SAFE** | `clucky_patty_eebg5g` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/clucky_patty_eebg5g) |
| Appetizers & Fried Chicken | **Onion Rings** | `onion-rings` | 340 PKR | **SAFE** | `onion_rings_pqkanq` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/onion_rings_pqkanq) |
| Appetizers & Fried Chicken | **Mozzarella Sticks** | `mozzarella-sticks` | 590 PKR | **SAFE** | `mozzarella_sticks_vwnda5` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/mozzarella_sticks_vwnda5) |
| Appetizers & Fried Chicken | **Fish N Chips** | `fish-n-chips` | 1400 PKR | **SAFE** | `fish_n_chips_q1aj81` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/fish_n_chips_q1aj81) |
| Appetizers & Fried Chicken | **Nuggets N Fries** | `nuggets-n-fries` | 490 PKR | **SAFE** | `nuggests_n_fries_gezwji` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/nuggests_n_fries_gezwji) |
| Appetizers & Fried Chicken | **Chicken Strips** | `chicken-strips` | 550 PKR | **SAFE** | `chicken_strips_vqmbba` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/chicken_strips_vqmbba) |
| Appetizers & Fried Chicken | **Chicken Wings** | `chicken-wings` | 550 PKR | **SAFE** | `chicken_wings_gpmwfl` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/chicken_wings_gpmwfl) |
| Appetizers & Fried Chicken | **Fried Chicken** | `fried-chicken` | 210 PKR | **SAFE** | `fired_chicken_jm1lel` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/fired_chicken_jm1lel) |
| Fries N More | **Regular Fries with Dip** | `regular-fries-with-dip` | 200 PKR | **SAFE** | `regular_fries_ih8b6a` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/regular_fries_ih8b6a) |
| Fries N More | **Large Fries with Dip** | `large-fries-with-dip` | 350 PKR | **SAFE** | `large_fries_fgkhrp` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/large_fries_fgkhrp) |
| Fries N More | **Curly Fries with Dip** | `curly-fries-with-dip` | 470 PKR | **SAFE** | `curly_fries_kpg20j` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/curly_fries_kpg20j) |
| Fries N More | **Beef Cheese Loaded Fries** | `beef-cheese-loaded-fries` | 690 PKR | **SAFE** | `beef_cheese_fries_fzsrlb` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/beef_cheese_fries_fzsrlb) |
| Fries N More | **Chicken Cheese Loaded Fries** | `chicken-cheese-loaded-fries` | 650 PKR | **SAFE** | `chicken_cheese_loaded_fries_mxhvzl` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/chicken_cheese_loaded_fries_mxhvzl) |
| Crunchwraps & Tortilla Wraps | **Creamy Kruncher** | `creamy-kruncher` | 550 PKR | **SAFE** | `creamy_kruncher_lizjvj` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/creamy_kruncher_lizjvj) |
| Crunchwraps & Tortilla Wraps | **Flame Fold** | `flame-fold` | 550 PKR | **SAFE** | `flame_fold_vcntdq` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/flame_fold_vcntdq) |
| Crunchwraps & Tortilla Wraps | **Crispy Chicken Wrap** | `crispy-chicken-wrap` | 560 PKR | **SAFE** | `crispy_chicken_wrap_mrq5r9` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/crispy_chicken_wrap_mrq5r9) |
| Crunchwraps & Tortilla Wraps | **Grilled Chicken Wrap** | `grilled-chicken-wrap` | 650 PKR | **SAFE** | `grilled_chicken_wrap_aemujl` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/grilled_chicken_wrap_aemujl) |
| Sandwiches | **Cheese Toast** | `cheese-toast` | 330 PKR | **SAFE** | `cheese_toast_nup1ek` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/cheese_toast_nup1ek) |
| Sandwiches | **Mujhe Anday Wala Burger** | `mujhe-anday-wala-burger` | 490 PKR | **MISSING_IMAGE** | *None* | *None* |
| Sandwiches | **Smashed Beef Sandwich** | `smashed-beef-sandwich` | 740 PKR | **SAFE** | `smashed_beef_sandwich_r372qm` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/smashed_beef_sandwich_r372qm) |
| Sandwiches | **Crispy Chicken Sandwich** | `crispy-chicken-sandwich` | 640 PKR | **SAFE** | `crispy_chicken_sandwich_tfxhzj` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/crispy_chicken_sandwich_tfxhzj) |
| Sandwiches | **Grilled Chicken Sandwich** | `grilled-chicken-sandwich` | 670 PKR | **SAFE** | `grilled_chicken_sandwich_vibv9o` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/grilled_chicken_sandwich_vibv9o) |
| Sandwiches | **Fish O Fillet** | `fish-o-fillet` | 850 PKR | **MISSING_IMAGE** | *None* | *None* |
| Pastas & Oven Sides | **Pasta La Vista** | `pasta-la-vista` | 630 PKR | **MISSING_IMAGE** | *None* | *None* |
| Artisan Round Pizzas | **Flaming Tikka** | `flaming-tikka-pizza` | 550 PKR | **SAFE** | `flaming_tikka_jlxcvy` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/flaming_tikka_jlxcvy) |
| Artisan Round Pizzas | **Behari Kebab** | `behari-kebab-pizza` | 550 PKR | **SAFE** | `behari_kebab_vg8nrm` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/behari_kebab_vg8nrm) |
| Artisan Round Pizzas | **Hot Pepperoni** | `hot-pepperoni-pizza` | 550 PKR | **SAFE** | `pepparoni_t2gore` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/pepparoni_t2gore) |
| Artisan Round Pizzas | **Creamy Alfredo** | `creamy-alfredo-pizza` | 550 PKR | **SAFE** | `creamy_alfredo_dexsaa` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/creamy_alfredo_dexsaa) |
| Artisan Round Pizzas | **Secret CNM** | `secret-cnm-pizza` | 550 PKR | **SAFE** | `secret_cnm_nd4ld2` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/secret_cnm_nd4ld2) |
| Signature Pizza Specials | **Tray Pizza** | `tray-pizza` | 2100 PKR | **SAFE** | `tray_pizza_pnyv2v` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/tray_pizza_pnyv2v) |
| Signature Pizza Specials | **Stuffed Calzone** | `stuffed-calzone` | 950 PKR | **SAFE** | `stuffed_calzone_t8ea5y` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/stuffed_calzone_t8ea5y) |
| Pastas & Oven Sides | **Spin Rolls** | `spin-rolls` | 420 PKR | **SAFE** | `spin_rolls_ihzaju` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/spin_rolls_ihzaju) |
| Pastas & Oven Sides | **Cheesy Garlic Bread** | `cheesy-garlic-bread` | 350 PKR | **SAFE** | `cheesy_garlic_bread_z6mmig` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/cheesy_garlic_bread_z6mmig) |
| Pastas & Oven Sides | **Baked Creamy Pasta** | `baked-creamy-pasta` | 690 PKR | **SAFE** | `creamy_baked_pasta_wybng5` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/creamy_baked_pasta_wybng5) |
| Pastas & Oven Sides | **Italian Pasta** | `italian-pasta` | 690 PKR | **SAFE** | `italian_pasta_aogag6` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/italian_pasta_aogag6) |
| Pastas & Oven Sides | **Pizza Fries** | `pizza-fries` | 690 PKR | **SAFE** | `pizza_fries_wfcsrr` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/pizza_fries_wfcsrr) |
| Pastas & Oven Sides | **Oven Baked Wings** | `oven-baked-wings` | 400 PKR | **SAFE** | `oven_baked_wings_uloepi` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/oven_baked_wings_uloepi) |
| Numbered Combo Deals | **Deal 1** | `combo-deal-1` | 1600 PKR | **SAFE** | `deal_1_plteut` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/deal_1_plteut) |
| Numbered Combo Deals | **Deal 2** | `combo-deal-2` | 2450 PKR | **SAFE** | `deal_2_rv9dvu` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/deal_2_rv9dvu) |
| Numbered Combo Deals | **Deal 3** | `combo-deal-3` | 3600 PKR | **SAFE** | `deal_3_slcbma` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/deal_3_slcbma) |
| Numbered Combo Deals | **Deal 4** | `combo-deal-4` | 700 PKR | **SAFE** | `deal_4_zrrbyz` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/deal_4_zrrbyz) |
| Numbered Combo Deals | **Deal 5 (2 X Pizzas)** | `combo-deal-5` | 1050 PKR | **SAFE** | `deal_5_u3cfyg` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/deal_5_u3cfyg) |
| Numbered Combo Deals | **Party Deal** | `party-deal` | 9999 PKR | **MISSING_IMAGE** | *None* | *None* |
| Student Offers | **Student Deal 1** | `student-deal-1` | 950 PKR | **SAFE** | `student_deal_1_bkrn27` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/student_deal_1_bkrn27) |
| Student Offers | **Student Deal 2** | `student-deal-2` | 870 PKR | **SAFE** | `student_deal_2_xth6lv` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/student_deal_2_xth6lv) |
| Student Offers | **Student Deal 3** | `student-deal-3` | 799 PKR | **SAFE** | `student_deal_3_qluyzp` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/student_deal_3_qluyzp) |
| Box Deals | **Big Bird Duo** | `big-bird-duo-deal` | 1550 PKR | **SAFE** | `big_bird_duo_rs96vy` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/big_bird_duo_rs96vy) |
| Box Deals | **Bull - Dozed** | `bull-dozed-deal` | 1920 PKR | **SAFE** | `bull_dozed_kgvg3p` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/bull_dozed_kgvg3p) |
| Box Deals | **Too Hot To Handle** | `too-hot-to-handle-deal` | 1580 PKR | **SAFE** | `too_hot_to_handle_m9lvrs` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/too_hot_to_handle_m9lvrs) |
| Box Deals | **Wrap It Up** | `wrap-it-up-deal` | 1380 PKR | **SAFE** | `wrap_it_up_ninvgr` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/wrap_it_up_ninvgr) |
| Box Deals | **Triple Threat** | `triple-threat-deal` | 2290 PKR | **SAFE** | `triple_threat_ptkwku` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/triple_threat_ptkwku) |
| Box Deals | **Chicken Box** | `chicken-box-deal` | 890 PKR | **SAFE** | `chicken_box_ixcgna` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/chicken_box_ixcgna) |
| Box Deals | **CNM Fiesta** | `cnm-fiesta-deal` | 3450 PKR | **SAFE** | `cnm_fiesta_s3cmyi` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/cnm_fiesta_s3cmyi) |
| Box Deals | **Quad Chick Feast** | `quad-chick-feast-deal` | 2480 PKR | **SAFE** | `quad_chick_feast_efsbgm` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/quad_chick_feast_efsbgm) |
| Box Deals | **Cluckin' Mootastic** | `cluckin-mootastic-deal` | 3350 PKR | **SAFE** | `cluckin_mootastic_vmlfyp` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/cluckin_mootastic_vmlfyp) |
| Desserts | **Choco French Toast** | `choco-french-toast` | 550 PKR | **SAFE** | `chco_french_toast_ez49da` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/chco_french_toast_ez49da) |
| Desserts | **Churros Locos** | `churros-locos` | 350 PKR | **SAFE** | `churros_locos_liffri` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/churros_locos_liffri) |
| Desserts | **Cookie Skillet** | `cookie-skillet` | 450 PKR | **SAFE** | `cookie_skillet_yjydjz` | [CDN URL](https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/cookie_skillet_yjydjz) |
| Drinks & Chillers | **Still Water** | `still-water` | 80 PKR | **MISSING_IMAGE** | *None* | *None* |
| Drinks & Chillers | **Soda Woda** | `soda-woda` | 110 PKR | **MISSING_IMAGE** | *None* | *None* |
| Drinks & Chillers | **Lemon Mint Refresher** | `lemon-mint-refresher` | 250 PKR | **MISSING_IMAGE** | *None* | *None* |
| Drinks & Chillers | **Peach Iced Tea** | `peach-iced-tea` | 250 PKR | **MISSING_IMAGE** | *None* | *None* |
| Drinks & Chillers | **Cold Coffee** | `cold-coffee` | 450 PKR | **MISSING_IMAGE** | *None* | *None* |
| Drinks & Chillers | **Milk Shakes** | `milk-shakes` | 540 PKR | **MISSING_IMAGE** | *None* | *None* |

---

## 4. Missing Image Items (10)

- **Mujhe Anday Wala Burger** (`prod_mujhe_anday_wala`, Category: `cat_sandwiches`): Specialty sandwich not in this Cloudinary photo batch
- **Fish O Fillet** (`prod_fish_o_fillet`, Category: `cat_sandwiches`): One For The Marines specialty item not in this Cloudinary photo batch
- **Pasta La Vista** (`prod_pasta_la_vista`, Category: `cat_pasta_sides`): Mama Mia pasta specialty not in this Cloudinary photo batch
- **Party Deal** (`prod_party_deal`, Category: `cat_combo_deals`): Mega party bundle not present in this Cloudinary photo batch
- **Still Water** (`prod_still_water`, Category: `cat_drinks`): Bottled beverage not present in Cloudinary photo batch
- **Soda Woda** (`prod_soda_woda`, Category: `cat_drinks`): Soft drink cans/bottles not present in Cloudinary photo batch
- **Lemon Mint Refresher** (`prod_lemon_mint_refresher`, Category: `cat_drinks`): Specialty chiller beverage not present in Cloudinary photo batch
- **Peach Iced Tea** (`prod_peach_iced_tea`, Category: `cat_drinks`): Specialty iced tea beverage not present in Cloudinary photo batch
- **Cold Coffee** (`prod_cold_coffee`, Category: `cat_drinks`): Coffee beverage not present in Cloudinary photo batch
- **Milk Shakes** (`prod_milk_shakes`, Category: `cat_drinks`): Shake beverages not present in Cloudinary photo batch

---

## 5. Excluded Duplicate Assets

- **Asset ID**: `cookie_skillet_2_r8an6w`
- **Status**: Excluded from mapping (Duplicate angle of Cookie Skillet). Primary asset `cookie_skillet_yjydjz` is synced.

---

## 6. Approved Owner Conflict Resolutions Applied

1. **Citrus Honey Crunch**: Used as canonical title with lemon honey sauce description.
2. **Mushroom n Swiss**: Used as canonical title, matching Cloudinary asset `mushroom_n_swiss_sgd3ct`.
3. **Smashin' Cluck**: Used as canonical title, matching Cloudinary asset `smashin_cluck_zcyqml`.
4. **Creamy Alfredo Calzone**: Corrected typo from menu board *"Creamy Alredo"*.
5. **Extra Patty**: Split into Extra Chicken Patty (200 PKR) and Extra Beef Patty (250 PKR).
6. **Party Deal**: Imported at active selling price of 9,999 PKR.

---

## 7. Rollback Verification

Backup file:
```bash
E:\Projects\Cluck n moo\data\backups\cnm_pre_menu_import_20260923132252.db
```
Rollback command:
```bash
copy "E:\Projects\Cluck n moo\data\backups\cnm_pre_menu_import_20260923132252.db" data/cnm.db
```
