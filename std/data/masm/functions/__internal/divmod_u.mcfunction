# https://github.com/gcc-mirror/gcc/blob/4013baf99c38f7bca06a51f8301e8fb195ccfa33/libgcc/config/riscv/div.S#L73-L97
scoreboard players operation #r2 masm = #r1 masm
scoreboard players operation #r1 masm = #r0 masm
scoreboard players set #r3 masm 1
scoreboard players operation #r1 masm += 2^31 masm
scoreboard players operation #a masm = #r2 masm
scoreboard players operation #a masm += 2^31 masm
execute if score #r1 masm > #a masm unless score #r2 masm matches ..0 run function masm:__internal/divmod_u_find
scoreboard players set #r0 masm 0
function masm:__internal/divmod_u_compare
scoreboard players operation #r1 masm -= 2^31 masm
