scoreboard players operation #c masm = #a masm
scoreboard players operation #a masm /= #b masm
scoreboard players operation #c masm %= #b masm
execute unless score #a masm matches 0.. unless score #c masm matches 0 run scoreboard players operation #c masm -= #b masm
