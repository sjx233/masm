scoreboard objectives add masm dummy
scoreboard players set -1 masm -1
scoreboard players set 2 masm 2
scoreboard players set 32 masm 32
scoreboard players set 2^8 masm 256
scoreboard players set 2^16 masm 65536
scoreboard players set 2^24 masm 16777216
scoreboard players set 2^31 masm -2147483648
scoreboard players set #page_size masm 65536
data merge storage masm:__internal {frames:[],stack:[],conditions:[],mem:{id:""}}
