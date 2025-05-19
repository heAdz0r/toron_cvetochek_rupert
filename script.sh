#!/bin/bash

# Создаем корневые директории
mkdir -p characters
mkdir -p relationship
mkdir -p places
mkdir -p world_description
mkdir -p artifacts_and_magic
mkdir -p journey

# --- CHARACTERS ---
mkdir -p characters/main_heroes
mkdir -p characters/villains
mkdir -p characters/friends_allies
mkdir -p characters/parents

# Main Heroes
touch characters/main_heroes/cvetochek.md
touch characters/main_heroes/toron.md
touch characters/main_heroes/rupert.md

# Villains
touch characters/villains/ludvig.md
touch characters/villains/doktor_yascher.md
touch characters/villains/bukvoed.md
touch characters/villains/tenebris.md
touch characters/villains/sumrak.md
touch characters/villains/kolyuchaya_vetv.md
touch characters/villains/baba_yaga.md
touch characters/villains/knyaz_koshmarov.md
touch characters/villains/doktor_shpritz.md
touch characters/villains/hmuroomrak.md
touch characters/villains/mrachnus.md
touch characters/villains/kleshnyak.md
touch characters/villains/spidermag.md

# Friends & Allies
touch characters/friends_allies/kolyuchka_ezhik.md
touch characters/friends_allies/mudraya_kara_kapibara.md
touch characters/friends_allies/lunnaya_griva_edinorog.md
touch characters/friends_allies/pushinka_hranitel_snov.md
touch characters/friends_allies/sova_travnitsa.md
touch characters/friends_allies/devochka_koroleva_fantaziya.md
touch characters/friends_allies/polli_popugaychik.md
touch characters/friends_allies/doktor_aybolit.md
touch characters/friends_allies/doktor_dentikl.md
touch characters/friends_allies/mudriy_kuznechik.md
touch characters/friends_allies/mudriy_dub.md
touch characters/friends_allies/korol_kotbert_mudriy.md
touch characters/friends_allies/kroliki_pushok_ushastik_hvostik.md
touch characters/friends_allies/koroleva_zubastikov.md
touch characters/friends_allies/luchik_feya.md
touch characters/friends_allies/koroleva_malinka.md
touch characters/friends_allies/kapitan_flint_prizrak.md
touch characters/friends_allies/iskrolyot_drakon.md
touch characters/friends_allies/saharnye_elfy.md
touch characters/friends_allies/bukvy_russkogo_alfavita.md
touch characters/friends_allies/kapitan_nemo.md
touch characters/friends_allies/drakon_vulkan.md
touch characters/friends_allies/domovyonok_kuzya.md
touch characters/friends_allies/rokki_pescherniy_monstr.md
touch characters/friends_allies/iskorka_sestra_torona.md
touch characters/friends_allies/siam_brat_cvetochka.md
touch characters/friends_allies/aliy_klyuvik_ptenets.md
touch characters/friends_allies/bantik_kotyonok.md
touch characters/friends_allies/tkach_pauk.md
touch characters/friends_allies/chelovek_pauk_matryoshka.md
touch characters/friends_allies/vilkins_igrushka.md
touch characters/friends_allies/trolli_s_zelenymi_ushami.md
touch characters/friends_allies/muravi_velikany.md
touch characters/friends_allies/plamya_vechnosti.md
touch characters/friends_allies/malchik_prividenie.md
touch characters/friends_allies/vozdushnye_elfy.md
touch characters/friends_allies/longi_dinozavr.md
touch characters/friends_allies/lunniy_vals_edinorog.md
touch characters/friends_allies/komarik_hihi.md

# Parents
touch characters/parents/liliya_i_oduvanchik.md

# --- RELATIONSHIP ---
touch relationship/cvetochek_toron_rupert.md
touch relationship/cvetochek_i_roditeli.md
touch relationship/cvetochek_i_siam.md

# --- PLACES ---
touch places/vechnotsvetie_korolevstvo.md
touch places/volshebniy_les.md
touch places/ognennaya_gora_zamok_torona.md
touch places/zacharovanniy_les_bashnya_ruperta.md
touch places/mir_kotikov.md
touch places/fantaziya_strana.md
touch places/yagodnoe_korolevstvo.md
touch places/ostrov_kostyanogo_cherepa.md
touch places/labirint_zabytyh_znaniy.md
touch places/park_attraktsionov_chudesnaya_karusel.md
touch places/volshebnaya_bolnitsa.md
touch places/lazurnoe_more.md
touch places/pylayushie_gory_vulkany.md
touch places/tyomniy_les_vechnotsvetie.md
touch places/zapretniy_les.md
touch places/pauchiy_park.md
touch places/solnechnye_holmy_gorod.md
touch places/saharnaya_polyana.md
touch places/strana_russkih_bukv.md
touch places/podvodniy_mir_okean.md
touch places/podzemnaya_peshera_s_sokrovishchami.md
touch places/stariy_zabroshenniy_zamok_prividenie.md
touch places/yadovitye_topi.md
touch places/opolovoe_korolevstvo.md
touch places/zamok_vechnogo_tsvetka.md
touch places/oblachnoe_korolevstvo.md
touch places/komnata_endi.md
touch places/sumerechniy_bor_gorod.md
touch places/gromovye_gory.md
touch places/lunnoe_ozero.md
touch places/beskonechniy_labirint_s_dveryu_v_mir_fey.md

# --- WORLD DESCRIPTION ---
touch world_description/vechnotsvetie_obschee.md

# --- ARTIFACTS AND MAGIC ---
touch artifacts_and_magic/magic_system_overview.md
touch artifacts_and_magic/notable_artifacts.md

# --- JOURNEY ---
touch journey/README.md
# Можно добавить текст в README.md, если нужно, например:
# echo "Описание, как будут называться файлы приключений" > journey/README.md

echo "Структура каталогов и файлов успешно создана!"