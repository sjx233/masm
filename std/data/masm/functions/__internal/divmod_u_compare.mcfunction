# https://github.com/gcc-mirror/gcc/blob/705510a708d3642c9c962beb663c476167e4e8a4/libgcc/config/riscv/div.S#L87-L94
scoreboard players operation #a masm = #r2 masm
scoreboard players operation #a masm += 2^31 masm
execute if score #r1 masm >= #a masm run scoreboard players operation #r0 masm += #r3 masm
execute if score #r1 masm >= #a masm run scoreboard players operation #r1 masm -= #r2 masm
scoreboard players operation #r3 masm /= 2 masm
execute unless score #r3 masm matches 0.. run scoreboard players operation #r3 masm -= 2^31 masm
scoreboard players operation #r2 masm /= 2 masm
execute unless score #r2 masm matches 0.. run scoreboard players operation #r2 masm -= 2^31 masm
execute unless score #r3 masm matches 0 run function masm:__internal/divmod_u_compare
