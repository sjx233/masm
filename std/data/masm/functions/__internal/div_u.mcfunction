scoreboard players operation #c masm = #a masm
scoreboard players operation #a masm %= #b masm
scoreboard players operation #c masm /= #b masm
execute unless score #c masm matches 0.. unless score #a masm matches 0 run scoreboard players add #c masm 1
