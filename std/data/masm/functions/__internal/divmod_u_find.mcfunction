# https://github.com/gcc-mirror/gcc/blob/705510a708d3642c9c962beb663c476167e4e8a4/libgcc/config/riscv/div.S#L80-L84
scoreboard players operation #r2 masm += #r2 masm
scoreboard players operation #r3 masm += #r3 masm
scoreboard players operation #a masm = #r2 masm
scoreboard players operation #a masm += 2^31 masm
execute if score #r1 masm > #a masm unless score #r2 masm matches ..0 run function masm:__internal/divmod_u_find