scoreboard objectives add masm dummy
scoreboard players set #i8_limit masm 256
scoreboard players set #i16_limit masm 65536
scoreboard players set #i24_limit masm 16777216
scoreboard players set #page_size masm 65536
data merge storage masm:__internal {frames:[],stack:[],conditions:[],memory:{id:""}}
