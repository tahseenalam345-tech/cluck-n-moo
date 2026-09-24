# Cluck N Moo (CNM) Cloudinary Asset-To-Menu Mapping Report

> **Document Status**: Complete Mapping Verification  
> **Source Directory**: Cloudinary `cnm/menu` (65 Assets Discovered)  
> **Target Menu**: Official Extracted CNM Menu (Images 1–5)  
> **Mapping Policy**: Deterministic name matching after stripping Cloudinary's 6-character random suffix. Zero semantic guessing.

---

## 1. Executive Summary

- **Total Cloudinary Assets Discovered**: 65
- **Direct 1:1 Verified Menu Item Matches**: 64
- **Duplicate / Alternate Asset Identified**: 1 (`cookie_skillet_2_r8an6w`)
- **Unmapped Cloudinary Assets**: 0 (Every asset belongs to a verified CNM menu item!)
- **Menu Items Missing Image in this Cloudinary Batch**: 11 (e.g. specialized beverages, Mujhe Anday Wala burger, Fish O Fillet, Pasta La Vista, Party Deal)

---

## 2. Verified Menu Item Mapping Table

| Official Category | Official Visible Menu Item | Proposed Product Slug | Matched Cloudinary Asset ID | Match Confidence | Secure Delivery URL (`f_auto,q_auto`) | Match Reason | Safe to Write? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Beef Burgers** | **The OG** | `the-og-burger` | `the_og_aigens` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/the_og_aigens` | Base name `the_og` matches menu title exactly | **SAFE** |
| **Beef Burgers** | **Classic Cheeseburger** | `classic-cheeseburger` | `classic_cheeseburger_fwnokj` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/classic_cheeseburger_fwnokj` | Base name `classic_cheeseburger` matches menu title exactly | **SAFE** |
| **Beef Burgers** | **Oklahoma Smash** | `oklahoma-smash-burger` | `oklahoma_wzcypj` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/oklahoma_wzcypj` | Base name `oklahoma` uniquely identifies Oklahoma Smash | **SAFE** |
| **Beef Burgers** | **Mushroom n Swiss** | `mushroom-n-swiss-burger` | `mushroom_n_swiss_sgd3ct` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/mushroom_n_swiss_sgd3ct` | Base name `mushroom_n_swiss` matches IMG-2 burger board exactly | **SAFE** |
| **Beef Burgers** | **Philly CheeseSteak** | `philly-cheesesteak` | `philly_cheesestack_un02hn` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/philly_cheesestack_un02hn` | Base name `philly_cheesestack` uniquely identifies Philly CheeseSteak | **SAFE** |
| **Chicken Burgers** | **Original Xinger** | `original-xinger-burger` | `original_xinger_gdemnd` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/original_xinger_gdemnd` | Base name `original_xinger` matches menu title exactly | **SAFE** |
| **Chicken Burgers** | **Nashville Hot** | `nashville-hot-burger` | `nashville_hot_ahgt9q` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/nashville_hot_ahgt9q` | Base name `nashville_hot` matches menu title exactly | **SAFE** |
| **Chicken Burgers** | **Citrus Honey Crunch** | `citrus-honey-crunch-burger` | `citrus_honey_crush_rcslnq` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/citrus_honey_crush_rcslnq` | Base name `citrus_honey_crush` uniquely matches Citrus/Lemon Honey Crunch | **SAFE** |
| **Chicken Burgers** | **Smashin' Cluck** | `smashin-cluck-burger` | `smashin_cluck_zcyqml` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/smashin_cluck_zcyqml` | Base name `smashin_cluck` matches IMG-2 burger board exactly | **SAFE** |
| **Chicken Burgers** | **Smoky BBQ** | `smoky-bbq-burger` | `smoky_bbq_woq6kt` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/smoky_bbq_woq6kt` | Base name `smoky_bbq` matches menu title exactly | **SAFE** |
| **Chicken Burgers** | **Clucky Patty** | `clucky-patty-burger` | `clucky_patty_eebg5g` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/clucky_patty_eebg5g` | Base name `clucky_patty` matches menu title exactly | **SAFE** |
| **Appetizers** | **Onion Rings** | `onion-rings` | `onion_rings_pqkanq` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/onion_rings_pqkanq` | Base name `onion_rings` matches menu title exactly | **SAFE** |
| **Appetizers** | **Mozzarella Sticks** | `mozzarella-sticks` | `mozzarella_sticks_vwnda5` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/mozzarella_sticks_vwnda5` | Base name `mozzarella_sticks` matches menu title exactly | **SAFE** |
| **Appetizers** | **Fish N Chips** | `fish-n-chips` | `fish_n_chips_q1aj81` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/fish_n_chips_q1aj81` | Base name `fish_n_chips` matches menu title exactly | **SAFE** |
| **Appetizers** | **Nuggets N Fries** | `nuggets-n-fries` | `nuggests_n_fries_gezwji` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/nuggests_n_fries_gezwji` | Base name `nuggests_n_fries` matches Nuggets N Fries (minor typo "nuggests") | **SAFE** |
| **Appetizers** | **Chicken Strips** | `chicken-strips` | `chicken_strips_vqmbba` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/chicken_strips_vqmbba` | Base name `chicken_strips` matches menu title exactly | **SAFE** |
| **Appetizers** | **Chicken Wings** | `chicken-wings` | `chicken_wings_gpmwfl` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/chicken_wings_gpmwfl` | Base name `chicken_wings` matches menu title exactly | **SAFE** |
| **Appetizers** | **Fried Chicken** | `fried-chicken` | `fired_chicken_jm1lel` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/fired_chicken_jm1lel` | Base name `fired_chicken` matches Fried Chicken (minor typo "fired") | **SAFE** |
| **Fries N More** | **Regular Fries with Dip** | `regular-fries-with-dip` | `regular_fries_ih8b6a` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/regular_fries_ih8b6a` | Base name `regular_fries` uniquely matches Regular Fries | **SAFE** |
| **Fries N More** | **Large Fries with Dip** | `large-fries-with-dip` | `large_fries_fgkhrp` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/large_fries_fgkhrp` | Base name `large_fries` uniquely matches Large Fries | **SAFE** |
| **Fries N More** | **Curly Fries with Dip** | `curly-fries-with-dip` | `curly_fries_kpg20j` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/curly_fries_kpg20j` | Base name `curly_fries` uniquely matches Curly Fries | **SAFE** |
| **Fries N More** | **Beef Cheese Loaded Fries** | `beef-cheese-loaded-fries` | `beef_cheese_fries_fzsrlb` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/beef_cheese_fries_fzsrlb` | Base name `beef_cheese_fries` uniquely matches Beef Cheese Loaded Fries | **SAFE** |
| **Fries N More** | **Chicken Cheese Loaded Fries** | `chicken-cheese-loaded-fries` | `chicken_cheese_loaded_fries_mxhvzl` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/chicken_cheese_loaded_fries_mxhvzl` | Base name `chicken_cheese_loaded_fries` matches menu title exactly | **SAFE** |
| **Crunchwraps** | **Creamy Kruncher** | `creamy-kruncher` | `creamy_kruncher_lizjvj` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/creamy_kruncher_lizjvj` | Base name `creamy_kruncher` matches menu title exactly | **SAFE** |
| **Crunchwraps** | **Flame Fold** | `flame-fold` | `flame_fold_vcntdq` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/flame_fold_vcntdq` | Base name `flame_fold` matches menu title exactly | **SAFE** |
| **Tortilla Wraps** | **Crispy Chicken Wrap** | `crispy-chicken-wrap` | `crispy_chicken_wrap_mrq5r9` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/crispy_chicken_wrap_mrq5r9` | Base name `crispy_chicken_wrap` matches menu title exactly | **SAFE** |
| **Tortilla Wraps** | **Grilled Chicken Wrap** | `grilled-chicken-wrap` | `grilled_chicken_wrap_aemujl` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/grilled_chicken_wrap_aemujl` | Base name `grilled_chicken_wrap` matches menu title exactly | **SAFE** |
| **Sandwiches** | **Cheese Toast** | `cheese-toast` | `cheese_toast_nup1ek` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/cheese_toast_nup1ek` | Base name `cheese_toast` matches menu title exactly | **SAFE** |
| **Sandwiches** | **Smashed Beef Sandwich** | `smashed-beef-sandwich` | `smashed_beef_sandwich_r372qm` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/smashed_beef_sandwich_r372qm` | Base name `smashed_beef_sandwich` matches menu title exactly | **SAFE** |
| **Sandwiches** | **Crispy Chicken Sandwich** | `crispy-chicken-sandwich` | `crispy_chicken_sandwich_tfxhzj` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/crispy_chicken_sandwich_tfxhzj` | Base name `crispy_chicken_sandwich` matches menu title exactly | **SAFE** |
| **Sandwiches** | **Grilled Chicken Sandwich** | `grilled-chicken-sandwich` | `grilled_chicken_sandwich_vibv9o` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/grilled_chicken_sandwich_vibv9o` | Base name `grilled_chicken_sandwich` matches menu title exactly | **SAFE** |
| **Round Pizzas** | **Flaming Tikka** | `flaming-tikka-pizza` | `flaming_tikka_jlxcvy` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/flaming_tikka_jlxcvy` | Base name `flaming_tikka` matches menu pizza flavor exactly | **SAFE** |
| **Round Pizzas** | **Behari Kebab** | `behari-kebab-pizza` | `behari_kebab_vg8nrm` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/behari_kebab_vg8nrm` | Base name `behari_kebab` matches menu pizza flavor exactly | **SAFE** |
| **Round Pizzas** | **Hot Pepperoni** | `hot-pepperoni-pizza` | `pepparoni_t2gore` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/pepparoni_t2gore` | Base name `pepparoni` uniquely matches Hot Pepperoni pizza | **SAFE** |
| **Round Pizzas** | **Creamy Alfredo** | `creamy-alfredo-pizza` | `creamy_alfredo_dexsaa` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/creamy_alfredo_dexsaa` | Base name `creamy_alfredo` matches menu pizza flavor exactly | **SAFE** |
| **Round Pizzas** | **Secret CNM** | `secret-cnm-pizza` | `secret_cnm_nd4ld2` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/secret_cnm_nd4ld2` | Base name `secret_cnm` matches menu pizza flavor exactly | **SAFE** |
| **Pizza Sides/Pasta** | **Spin Rolls** | `spin-rolls` | `spin_rolls_ihzaju` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/spin_rolls_ihzaju` | Base name `spin_rolls` matches menu title exactly | **SAFE** |
| **Pizza Sides/Pasta** | **Cheesy Garlic Bread** | `cheesy-garlic-bread` | `cheesy_garlic_bread_z6mmig` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/cheesy_garlic_bread_z6mmig` | Base name `cheesy_garlic_bread` matches menu title exactly | **SAFE** |
| **Pizza Sides/Pasta** | **Baked Creamy Pasta** | `baked-creamy-pasta` | `creamy_baked_pasta_wybng5` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/creamy_baked_pasta_wybng5` | Base name `creamy_baked_pasta` uniquely matches Baked Creamy Pasta | **SAFE** |
| **Pizza Sides/Pasta** | **Italian Pasta** | `italian-pasta` | `italian_pasta_aogag6` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/italian_pasta_aogag6` | Base name `italian_pasta` matches menu title exactly | **SAFE** |
| **Pizza Sides/Pasta** | **Pizza Fries** | `pizza-fries` | `pizza_fries_wfcsrr` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/pizza_fries_wfcsrr` | Base name `pizza_fries` matches menu title exactly | **SAFE** |
| **Pizza Sides/Pasta** | **Oven Baked Wings** | `oven-baked-wings` | `oven_baked_wings_uloepi` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/oven_baked_wings_uloepi` | Base name `oven_baked_wings` matches menu title exactly | **SAFE** |
| **Pizza Specials** | **Tray Pizza** | `tray-pizza` | `tray_pizza_pnyv2v` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/tray_pizza_pnyv2v` | Base name `tray_pizza` matches menu special title exactly | **SAFE** |
| **Pizza Specials** | **Stuffed Calzone** | `stuffed-calzone` | `stuffed_calzone_t8ea5y` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/stuffed_calzone_t8ea5y` | Base name `stuffed_calzone` matches menu special title exactly | **SAFE** |
| **Combo Deals** | **DEAL 1** | `combo-deal-1` | `deal_1_plteut` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/deal_1_plteut` | Base name `deal_1` matches Combo Deal 1 on IMG-1 | **SAFE** |
| **Combo Deals** | **DEAL 2** | `combo-deal-2` | `deal_2_rv9dvu` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/deal_2_rv9dvu` | Base name `deal_2` matches Combo Deal 2 on IMG-1 | **SAFE** |
| **Combo Deals** | **DEAL 3** | `combo-deal-3` | `deal_3_slcbma` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/deal_3_slcbma` | Base name `deal_3` matches Combo Deal 3 on IMG-1 | **SAFE** |
| **Combo Deals** | **DEAL 4** | `combo-deal-4` | `deal_4_zrrbyz` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/deal_4_zrrbyz` | Base name `deal_4` matches Combo Deal 4 on IMG-1 | **SAFE** |
| **Combo Deals** | **DEAL 5** | `combo-deal-5` | `deal_5_u3cfyg` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/deal_5_u3cfyg` | Base name `deal_5` matches Combo Deal 5 on IMG-1 | **SAFE** |
| **Student Offers** | **STUDENT DEAL 1** | `student-deal-1` | `student_deal_1_bkrn27` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/student_deal_1_bkrn27` | Base name `student_deal_1` matches Student Deal 1 exactly | **SAFE** |
| **Student Offers** | **STUDENT DEAL 2** | `student-deal-2` | `student_deal_2_xth6lv` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/student_deal_2_xth6lv` | Base name `student_deal_2` matches Student Deal 2 exactly | **SAFE** |
| **Student Offers** | **STUDENT DEAL 3** | `student-deal-3` | `student_deal_3_qluyzp` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/student_deal_3_qluyzp` | Base name `student_deal_3` matches Student Deal 3 exactly | **SAFE** |
| **Box Deals** | **BIG BIRD DUO** | `big-bird-duo-deal` | `big_bird_duo_rs96vy` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/big_bird_duo_rs96vy` | Base name `big_bird_duo` matches Box Deal title exactly | **SAFE** |
| **Box Deals** | **BULL - DOZED** | `bull-dozed-deal` | `bull_dozed_kgvg3p` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/bull_dozed_kgvg3p` | Base name `bull_dozed` matches Box Deal title exactly | **SAFE** |
| **Box Deals** | **TOO HOT TO HANDLE** | `too-hot-to-handle-deal` | `too_hot_to_handle_m9lvrs` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/too_hot_to_handle_m9lvrs` | Base name `too_hot_to_handle` matches Box Deal title exactly | **SAFE** |
| **Box Deals** | **WRAP IT UP** | `wrap-it-up-deal` | `wrap_it_up_ninvgr` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/wrap_it_up_ninvgr` | Base name `wrap_it_up` matches Box Deal title exactly | **SAFE** |
| **Box Deals** | **TRIPLE THREAT** | `triple-threat-deal` | `triple_threat_ptkwku` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/triple_threat_ptkwku` | Base name `triple_threat` matches Box Deal title exactly | **SAFE** |
| **Box Deals** | **CHICKEN BOX** | `chicken-box-deal` | `chicken_box_ixcgna` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/chicken_box_ixcgna` | Base name `chicken_box` matches Box Deal title exactly | **SAFE** |
| **Box Deals** | **CNM FIESTA** | `cnm-fiesta-deal` | `cnm_fiesta_s3cmyi` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/cnm_fiesta_s3cmyi` | Base name `cnm_fiesta` matches Box Deal title exactly | **SAFE** |
| **Box Deals** | **QUAD CHICK FEAST** | `quad-chick-feast-deal` | `quad_chick_feast_efsbgm` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/quad_chick_feast_efsbgm` | Base name `quad_chick_feast` matches Box Deal title exactly | **SAFE** |
| **Box Deals** | **CLUCKIN' MOOTASTIC** | `cluckin-mootastic-deal` | `cluckin_mootastic_vmlfyp` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/cluckin_mootastic_vmlfyp` | Base name `cluckin_mootastic` matches Box Deal title exactly | **SAFE** |
| **Desserts** | **Choco French Toast** | `choco-french-toast` | `chco_french_toast_ez49da` | UNIQUE_SHORT_NAME | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/chco_french_toast_ez49da` | Base name `chco_french_toast` matches Choco French Toast (minor typo "chco") | **SAFE** |
| **Desserts** | **Churros Locos** | `churros-locos` | `churros_locos_liffri` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/churros_locos_liffri` | Base name `churros_locos` matches menu title exactly | **SAFE** |
| **Desserts** | **Cookie Skillet** | `cookie-skillet` | `cookie_skillet_yjydjz` | EXACT | `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/cookie_skillet_yjydjz` | Primary asset matching Cookie Skillet on IMG-1 and IMG-4 | **SAFE** |

---

## 3. Duplicate and Suspicious Cloudinary Assets

| Asset Public ID | Dimensions / Format | Analysis / Status | Handling Recommendation |
| :--- | :--- | :--- | :--- |
| **`cookie_skillet_2_r8an6w`** | 2400x1792 (JPG, 2625.5 KB) | **DUPLICATE_ASSET**: Second shot/angle of the Cookie Skillet dessert. | Retain as backup in Cloudinary; do not map as primary image to avoid ambiguity. |
| **`fired_chicken_jm1lel`** | 2400x1792 (JPG, 2300.6 KB) | **TYPO_IN_FILENAME**: Spelled `fired_chicken` instead of `fried_chicken`. | Mapped to Fried Chicken (`fried-chicken`). Content matches fried chicken pieces. |
| **`chco_french_toast_ez49da`** | 2400x1792 (JPG, 2613.8 KB) | **TYPO_IN_FILENAME**: Spelled `chco_french_toast` instead of `choco_french_toast`. | Mapped to Choco French Toast (`choco-french-toast`). Content matches dessert. |
| **`nuggests_n_fries_gezwji`** | 2400x1792 (JPG, 2261.7 KB) | **TYPO_IN_FILENAME**: Spelled `nuggests_n_fries` instead of `nuggets_n_fries`. | Mapped to Nuggets N Fries (`nuggets-n-fries`). Content matches nuggets and fries. |
| **`citrus_honey_crush_rcslnq`** | 2400x1792 (JPG, 2304.3 KB) | **VARIATION_IN_FILENAME**: Spelled `citrus_honey_crush` instead of `crunch`. | Mapped to Citrus Honey Crunch burger. Matches IMG-2 photo. |

---

## 4. Menu Items with Missing Images (`MISSING_IMAGE`)

The following items from the official menu images do not have a dedicated image in the `cnm/menu` Cloudinary folder batch:

| Official Category | Official Visible Menu Item | Reason / Status |
| :--- | :--- | :--- |
| **Sandwiches** | **Mujhe Anday Wala Burger** | No asset named `mujhe_anday_wala` or similar in Cloudinary. |
| **One For The Marines** | **Fish O Fillet** | No asset named `fish_o_fillet` or `fish_fillet` in Cloudinary. |
| **Mama Mia** | **Pasta La Vista** | No asset named `pasta_la_vista` in Cloudinary (`creamy_baked_pasta` and `italian_pasta` are present for Pizza menu pastas). |
| **Pizza Menu** | **Make Your Own Pizza** | Custom builder configuration (typically uses dynamic or composite image). |
| **Combo Deals** | **Party Deal** | No asset named `party_deal` in Cloudinary. |
| **Drinks** | **Still Water** | Beverage item; not uploaded to Cloudinary `cnm/menu`. |
| **Drinks** | **Soda Woda** | Beverage item; not uploaded to Cloudinary `cnm/menu`. |
| **Drinks** | **Lemon Mint Refresher** | Specialty chiller beverage; not uploaded to Cloudinary `cnm/menu`. |
| **Drinks** | **Peach Iced Tea** | Specialty chiller beverage; not uploaded to Cloudinary `cnm/menu`. |
| **Drinks** | **Cold Coffee** | Specialty coffee beverage; not uploaded to Cloudinary `cnm/menu`. |
| **Drinks** | **Milk Shakes** | Hand-spun milkshake items; not uploaded to Cloudinary `cnm/menu`. |

---

## 5. Ambiguous Mappings (`AMBIGUOUS`)

- **Result**: **Zero ambiguous mappings.**
- Every single one of the 64 matched Cloudinary assets uniquely resolves to exactly one official menu item from the extracted boards. No asset could plausibly belong to two separate items.
