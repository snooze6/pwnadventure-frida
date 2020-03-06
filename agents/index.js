let GameLogic = Module.findBaseAddress('GameLogic.dll');

let offset_chat = "0x0100551A0"; //void __thiscall Player::Chat(Player *this, const char *te0t)
let offset_get_walking_speed = "0x01004FF90"; //float __thiscall Player::GetWalkingSpeed(Player *this)
let offset_get_jump_speed = "0x01004FFA0"; //float __thiscall Player::GetJumpSpeed(Player *this)
let offset_can_jump = "0x010051680"; //bool __thiscall Player::CanJump(Player *this)
let offset_get_position = "0x0100016F0"; //Vector3 *__thiscall Actor::GetPosition(Actor *this, Vector3 *result)
let offset_set_position = "0x010001C80"; //void __thiscall Actor::SetPosition(Actor *this, Vector3 *pos)
// let offset_get_mana = "0x01004FF70"; //int __thiscall Player::GetMana(Player *this)

let offset_get_mana = "0x01004FF70"; //int __thiscall Player::GetMana(Player *this)
let offset_get_health = "0x10001780"; //int __thiscall Actor::GetHealth(Actor *this)

let offset_angry_bear_get_attack_damage = "0x10004980";
let offset_bear_attack_damage = "0x100051A0";
let offset_attack = "0x100108F0";

//Only positive integers
function find_func(base, ida_addr){
    return ptr(base).sub("0x10000000").add(ida_addr);
}

// https://tresp4sser.wordpress.com/2012/10/06/how-to-hook-thiscall-functions/
// https://github.com/frida/frida/issues/166
// let getPosition = new NativeFunction(find_func(GameLogic, offset_get_position), 'pointer', ['pointer', 'pointer', 'pointer'], 'stdcall');
let getPosition = new NativeFunction(find_func(GameLogic, offset_get_position), 'pointer', ['pointer', 'pointer', 'pointer'], 'fastcall');
// let setPosition = new NativeFunction(find_func(GameLogic, offset_set_position), 'void', ['pointer', 'pointer', 'pointer'], 'stdcall');
let setPosition = new NativeFunction(find_func(GameLogic, offset_set_position), 'void', ['pointer', 'pointer', 'pointer'], 'fastcall');

class Player {
    constructor(GameLogic){
        console.log('[+] - Setting up Player');
        this.GameLogic = GameLogic;
        this.speed = null;
        this.mana = null;
        this.health = null;
        this.addr = null;
        this.jump = null;
        this.invincibility = false;

        let player = this;
        console.log('[+] - Getting player memory direction');
        Interceptor.attach(find_func(GameLogic, offset_get_walking_speed),{
            onEnter: function (args) {
                // https://tresp4sser.wordpress.com/2012/10/06/how-to-hook-thiscall-functions/
                // This pointer is passed through ECX register
                if (!player.addr) {
                    player.addr = this.context.ecx;
                    console.log('[+] - Player at ' + player.addr)
                }
            }
        });
    }

    //float __thiscall Player::GetWalkingSpeed(Player *this)
    setSpeed(speed){
        this.speed = speed;
        const player = this;

        console.log('[+] Hooking GetWalkingSpeed with speed='+speed);
        Interceptor.attach(ptr(find_func(GameLogic, offset_get_walking_speed)),{
            onEnter: function (args) {
                if (speed) {
                    this.walkingSpeedAddr = ptr(player.addr).add('0x00000120');
                    // console.log('[+] - Walking speed is '+Memory.readFloat(this.walkingSpeedAddr));
                    Memory.writeFloat(this.walkingSpeedAddr, speed)
                }
            }
        });
    }

    //float __thiscall Player::GetJumpSpeed(Player *this)
    setJumpSpeed(speed){
        this.jump = speed;
        const player = this;

        console.log('[+] Hooking GetJumpSpeed with speed='+speed);
        Interceptor.attach(ptr(find_func(GameLogic, offset_get_jump_speed)),{
            onEnter: function (args) {
                if (speed) {
                    this.jumpSpeedAddr = ptr(player.addr).add('0x00000124');
                    // console.log('[+] - Walking speed is '+Memory.readFloat(this.walkingSpeedAddr));
                    Memory.writeFloat(this.jumpSpeedAddr, speed)
                }
            }
        });

        this.canJump(1)
    }

    //int __thiscall Player::GetMana(Player *this)
    setMana(mana){
        this.mana = mana;
        const player = this;

        console.log('[+] Hooking GetMana with mana='+mana);
        Memory.writeInt(ptr(player.addr).add('0x000000BC'), mana);

        // Interceptor.attach(ptr(find_func(GameLogic, offset_get_mana)),{
        //     onEnter: function (args) {
        //         if (mana) {
        //             this.manaAddr = ptr(player.addr).add('0x000000BC');
        //             // console.log('[+] - Walking speed is '+Memory.readFloat(this.walkingSpeedAddr));
        //             Memory.writeInt(this.manaAddr, mana)
        //         }
        //     }
        // });
    }

    //int __thiscall Actor::GetHealth(Actor *this)
    setHealth(health){
        this.health = health;
        const player = this;

        console.log('[+] Hooking GetHealth with health='+health);

        Memory.writeInt(ptr(player.addr).add('0x00000030'), health);
    }

    // TODO: Be invincible against other foes
    setInvincibility(i){
        this.invincibility = i;
        const player = this;

        console.log('[+] Player invincibility = '+i);

        Interceptor.attach(ptr(find_func(GameLogic, offset_angry_bear_get_attack_damage)),{
            onEnter: function (args) {
                if (i) {
                    console.log('[!] - Angry Bear <' + this.context.ecx + '> attacked but it\'s not very effective');
                }
            },
            onLeave: function (ret) {
                if (i){
                    ret.replace('0x00')
                }
            }
        });

        Interceptor.attach(ptr(find_func(GameLogic, offset_bear_attack_damage)),{
            onEnter: function (args) {
                if (i) {
                    console.log('[!] - Bear <' + this.context.ecx + '> attacked but it\'s not very effective');
                }
            },
            onLeave: function (ret) {
                if (i){
                    ret.replace('0x00')
                }
            }
        });

        Interceptor.attach(ptr(find_func(GameLogic, offset_attack)),{
            onEnter: function (args) {
                console.log('[!] - Attack called')
            }
        });
    }

    //bool __thiscall Player::CanJump(Player *this)
    canJump(i){
        const player = this;
        console.log('[+] Hooking canJump');
        Interceptor.attach(find_func(GameLogic, offset_can_jump),{
            onLeave: function (ret) {
                ret.replace(i);
            }
        })
    }

}

function setup(){
    if (GameLogic) {
        console.log('[+] - Game Logic found on '+GameLogic);
        console.log('[+] - Creating player');

        let player = new Player(GameLogic);

        console.log('[+] - Hooking chat at '+find_func(GameLogic, offset_chat));

        Interceptor.attach(ptr(find_func(GameLogic, offset_chat)),{
            onEnter: function (args) {
                let msg = Memory.readCString(args[0]);
                console.log('    > Player says: '+msg);

                if (msg && msg.startsWith('!')){
                    let split = msg.split(' ');

                    switch(split[0]){
                        case '!jump':
                            player.setJumpSpeed(parseInt(split[1]));
                            break;
                        case '!speed':
                            player.setSpeed(parseInt(split[1]));
                            break;
                        case '!addr':
                            console.log('[+] Player address at '+args[1]);
                            break;
                        case '!mana':
                            player.setMana(parseInt(split[1]));
                            break;
                        case '!health':
                            player.setHealth(parseInt(split[1]));
                            break;
                        case '!invincible':
                            if (split[1] === "false"){
                                player.setInvincibility(false)
                            } else {
                                player.setInvincibility(true)
                            }
                            break;
                        default:
                            console.log('[+] - <TODO: Show help>')
                    }
                }
            }
        });

        return player
    }

}

// Global object is accesible through frida
global.cheat = {
    setup: setup,
    tools:{
        find: find_func,
    }
};

rpc.exports = {
    setup: setup
};