# Targeted light-recess restoration

Lucas reported blocky/pixelated bright blue ceiling recesses and asked to restore only the recesses, preserving the ceiling. The current GLB proves these are seven separate ceiling meshes with bake labels well-01 through well-07; the large ceiling has label ceiling. Geometry was not changed by compression or this fix.

The loader now exempts the seven wells from all compressed tiers, alongside the existing original PNG floor exception. Regeneration preserves the exception and removes the obsolete seven balanced KTX maps. All seven switch from compressed 256×256 to original uncompressed 512×512; the large ceiling stays compressed 1024×1024. Paired before/after images use the same camera near Virtual Cooking, looking at well-04. The original PNGs remove the evident rough blotches in that comparison. Desktop and touch contexts both verified the actual shader uniform bindings for all seven original textures and the still-compressed main ceiling, without script errors. Production build, source/hash validation and gallery checks passed. Regression harness now checks the seven wells in addition to the floor.

Implementation commit b6af2c1. Existing unrelated tomorrow-casestudy-plan.md edits were excluded. The remainder of the faster-loading pipeline remains unchanged.
