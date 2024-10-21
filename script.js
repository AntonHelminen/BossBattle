// Dude's bizarre boss battle
// Based on the course demo and takes inspiration from I wanna be the guy-fangames, which I have played in the past.
// I used ChatGPT to find bugs in the code and commands for entity destruction handling, trajectory calculation and tween.

let game;

const gameOptions = {
    dudeGravity: 1500,
    dudeSpeed: 300,
    bulletSpeed: 500 // Speed for the bullet
}

window.onload = function() {
    let gameConfig = {
        type: Phaser.AUTO,
        backgroundColor: "#112211",
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1500,
            height: 1000,
        },
        pixelArt: true,
        physics: {
            default: "arcade",
            arcade: {
                gravity: {
                    y: 0
                }
            }
        },

        scene: [PlayGame, NextStage, EndGame, WinGame]
        //scene: [NextStage, EndGame, WinGame]
    }
    game = new Phaser.Game(gameConfig)
    window.focus();
}

class PlayGame extends Phaser.Scene {

    constructor() {
        super("PlayGame")
        this.facingRight = true; // Track the direction the dude is facing
        this.playerhealth = 10; // How many hits the player can take
        this.doubleJump = false; // Track if the player can double jump
        this.bulletCap = 5; // Max bullets on screen
        this.bulletsOnScreen = 0; // Bullet tracker
        this.bossHealth = 80; // Boss health
        this.greyStarHealth = 20; // Miniboss health
        this.timer = 0; // Seconds passed
        this.can_attack = true; // Whether boss can attack
    }

    preload() {
        this.load.image("ground", "assets/platform.png")
        this.load.image("star", "assets/star.png")
        this.load.spritesheet("dude", "assets/dude.png", {frameWidth: 32, frameHeight: 48})
        this.load.spritesheet("bullet", "assets/bullet.png", {frameWidth: 1080, frameHeight: 1080, scale: 0.01})
        this.load.image("damaged_star", "assets/damaged_star.png")
        this.load.image("hurt_star", "assets/hurt_star.png")
        this.load.image("grey_star", "assets/star_enemy.png")
        this.load.image("damaged_grey_star", "assets/star_enemy_damaged.png")
        this.load.image("spike_down", "assets/spike_down.png")
        this.load.image("boss_hp", "assets/boss_hp.png")


        this.load.audio('music', 'assets/sound/Background_music.mp3');
        this.load.audio('gun', 'assets/sound/gun.mp3');
        this.load.audio('shot', 'assets/sound/shot.mp3');
        this.load.audio('metal_hit', 'assets/sound/metal_hit.mp3');
        this.load.audio('crush', 'assets/sound/crush.mp3');
        this.load.audio('boss_hit', 'assets/sound/boss_hit.mp3');
        this.load.audio('entrance', 'assets/sound/entrance.mp3');
        this.load.audio('death_sound', 'assets/sound/death_sound.mp3');
        this.load.audio('jump', 'assets/sound/jump.mp3');
        this.load.audio('crack', 'assets/sound/norppaEats.mp3');
        this.load.audio('haaa', 'assets/sound/haaa.mp3');
    }
    
    create() {
        
        // Music and sound effects
        this.backgroundMusic = this.sound.add('music');
        this.crush = this.sound.add('crush')
        this.gun = this.sound.add('gun')
        this.shot = this.sound.add('shot')
        this.metal_hit = this.sound.add('metal_hit')
        this.boss_hit = this.sound.add('boss_hit');
        this.entrance = this.sound.add('entrance');
        this.death_sound = this.sound.add('death_sound');
        this.jump = this.sound.add('jump')
        this.crack = this.sound.add('crack')
        this.haaa = this.sound.add('haaa')
    
        this.backgroundMusic.play({
            loop: true,
            volume: 1
        });

        // Create boss fight platforms:
        this.groundGroup = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })
        this.groundGroup.create(game.config.width*0.25, game.config.height*0.2, "ground")
        this.groundGroup.create(game.config.width*0.1, game.config.height*0.3, "ground")
        this.groundGroup.create(game.config.width*0.25, game.config.height*0.4, "ground")
        this.groundGroup.create(game.config.width*0.1, game.config.height*0.5, "ground")
        this.groundGroup.create(game.config.width*0.25, game.config.height*0.6, "ground")
        this.groundGroup.create(game.config.width*0.1, game.config.height*0.7, "ground")
        this.groundGroup.create(game.config.width*0.25, game.config.height*0.8, "ground")

        // Spikes 76 for the top of the screen
        this.spikeGroup = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })
        for(let i = 0; i < 76; i++) {
            this.spikeGroup.create(i*20, 5, "spike_down")
        }

        // Create player
        this.dude = this.physics.add.sprite(game.config.width*0.1, game.config.height*0.10, "dude")
        this.dude.body.gravity.y = gameOptions.dudeGravity
        this.physics.add.collider(this.dude, this.groundGroup)
        this.physics.add.overlap(this.dude, this.spikeGroup, this.dudeHitSpike, null, this)

        // Create bullets group
        this.bulletGroup = this.physics.add.group({
            maxSize: this.bulletCap
        })
        this.physics.add.overlap(this.bulletGroup, this.groundGroup, this.bulletHitGround, null, this)
        
        // Setup stars (These are now the enemy bullets)
        this.starsGroup = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.starsGroup, this.getStarred, null, this)
        
        // Add health display
        this.add.image(16, 33, "star")
        this.healthText = this.add.text(32, 20, this.playerhealth, {fontSize: "30px", fill: "#ffffff"})

        // Timer display
        this.timerText = this.add.text(game.config.width*0.45, 20, "Seconds passed: 0", {fontSize: "30px", fill: "#ffffff"})

        // MINIBOSS
        this.grey_star_group = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.grey_star_group, this.getHeavyStarred, null, this)
        this.physics.add.overlap(this.bulletGroup, this.grey_star_group, this.bulletHitGreyStar, null, this);

        // BOSS 
        this.star_boss = this.physics.add.sprite(game.config.width*0.9, game.config.height*0.15, "star");
        this.star_boss.setScale(7)
        this.bossHealthText = this.add.text(game.config.width*0.85, 20, "BOSS HP: " + this.bossHealth, {fontSize: "30px", fill: "#ffffff"})
        this.physics.add.overlap(this.star_boss, this.bulletGroup, this.bulletHitBoss, null, this);

        //Add a tween to move the object up and down (From ChatGPT)
        this.tweens.add({
            targets: this.star_boss,
            y: { 
                from: game.config.height*0.15,
                to: game.config.height*0.8
            },
            duration: 3000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1 
        })
        // Boss health bar
        this.bossMaxHealth = this.bossHealth;
        this.bossHealthBar = this.add.image(0, game.config.height-10, "boss_hp")
        this.bossHealthBar.setScale(20,2);

        // MOVEMENT
        // Cursor keys
        this.cursors = this.input.keyboard.createCursorKeys()
        
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
        this.shootKey_2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

        this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
        this.jumpKey_2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
        
        this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)

        // Turning to left and left movement
        this.anims.create({
            key: "left",
            frames: this.anims.generateFrameNumbers("dude", {start: 0, end: 3}),
            frameRate: 10,
            repeat: -1
        })

        this.anims.create({
            key: "halt_left",
            frames: [{key: "dude", frame: 2}],
            frameRate: 10,
        })

        this.anims.create({
            key: "shoot_left",
            frames: [{key: "dude", frame: 0}],
            frameRate: 10,
            repeat: -1
        })

        
        // Turning to right and right movement
        this.anims.create({
            key: "right",
            frames: this.anims.generateFrameNumbers("dude", {start: 5, end: 9}),
            frameRate: 10,
            repeat: -1
        })

        this.anims.create({
            key: "halt_right",
            frames: [{key: "dude", frame: 5}],
            frameRate: 10,
        })

        this.anims.create({
            key: "shoot_right",
            frames: [{key: "dude", frame: 7}],
            frameRate: 10,
            repeat: -1
        })

        // Boss attacks cycle
        this.triggerTimer = this.time.addEvent({
            callback: this.homing_star_attack,
            callbackScope: this,
            delay: 1000, // Starts after 1 second
            loop: false
        })

        // Grey star miniboss summon
        this.triggerTimer = this.time.addEvent({
            callback: this.spawn_grey_star,
            callbackScope: this,
            delay: 30000, // Spawns every 30 seconds
            loop: true
        })

        // Game becomes more annoying after 60 seconds have passed
        this.triggerTimer = this.time.addEvent({
            callback: this.spawn_random360,
            callbackScope: this,
            delay: 60000, // Spawns after 60 seconds
            loop: false
        })

        this.triggerTimer = this.time.addEvent({
            callback: this.timer_update,
            callbackScope: this,
            delay: 1000, // Updates every second
            loop: true
        })

    }
    // Refresh and reset the game
    refreshScreen() {
        window.location.reload();
    }

    // Function to handle shooting
    shoot() {

        this.gun.play({
            loop: false,
            volume: 0.8
        });

        let bullet;
        if (this.facingRight) {
            bullet = this.bulletGroup.create(this.dude.x + 20, this.dude.y+10, 'bullet');
        } else {
            bullet = this.bulletGroup.create(this.dude.x - 20, this.dude.y+10, 'bullet');
        }
        
        bullet.setScale(0.05);
        
        if (this.facingRight) {
            bullet.body.velocity.x = gameOptions.bulletSpeed;
        } else {
            
            bullet.body.velocity.x = -gameOptions.bulletSpeed;
        }
        bullet.body.allowGravity = false; 
    }
    // Spawn enemy grey star
    spawn_grey_star() {
        if(this.can_attack) {
            this.entrance.play({
                loop: false,
                volume: 2
            });
            let grey_star;
            grey_star = this.grey_star_group.create(game.config.width, game.config.height*0.5, 'grey_star');
            grey_star.setScale(30)
            grey_star.body.velocity.x = -gameOptions.bulletSpeed*0.3
            grey_star.body.velocity.y = 0
        }
    }

    timer_update() {
        this.timer += 1;
        this.timerText.setText("Seconds passed: " + this.timer)
    }

    // The boss Shoots ten stars at the players current position
    homing_star_attack() {
        if(this.can_attack) {
            this.time.delayedCall(1000, () => {
                for(let i = 0; i < 10; i++) {
                    this.time.delayedCall(i*1000, () => {
                        if(this.can_attack) {

                            this.shot.play({
                                loop: false,
                                volume: 2
                            });

                            let star;
                            star = this.starsGroup.create(this.star_boss.x-20, this.star_boss.y, 'star');
                            star.setScale(2)
                            const dx = this.dude.x - star.x;
                            const dy = this.dude.y - star.y;

                            const angle = Math.atan2(dy, dx);

                            star.body.velocity.x = Math.cos(angle) * gameOptions.bulletSpeed*1.1;
                            star.body.velocity.y = Math.sin(angle) * gameOptions.bulletSpeed*1.1;

                            star.body.allowGravity = false;
                            if (i >= 9) {
                                this.star_rain();
                            }
                        }
                        }, [], this); 
                }
            }, [], this);
        }
    }
    // The boss rains down stars
    star_rain() {
        if(this.can_attack) {
            this.time.delayedCall(1000, () => {
                for(let i = 0; i < 100; i++) {
                    this.time.delayedCall(i*100, () => {
                        if(this.can_attack) {
                            this.shot.play({
                                loop: false,
                                volume: 2
                            });

                            let star;
                            star = this.starsGroup.create(Phaser.Math.Between(0, game.config.width), 0, 'star');
                            star.body.velocity.y = gameOptions.bulletSpeed*1;

                            star.body.allowGravity = false;

                
                            if (i >= 99) {
                                this.star_pain();
                            }
                        }
                    }, [], this);
                }
            }, [], this);
        }
    }
    star_pain() {
        if(this.can_attack) {
            this.time.delayedCall(1000, () => {
                for(let i = 0; i < 15; i++) {
                    this.time.delayedCall(i*300, () => {
                        if(this.can_attack) {
                            this.shot.play({
                                loop: false,
                                volume: 2
                            });

                            let star;
                            star = this.starsGroup.create(this.star_boss.x, Phaser.Math.Between(0, game.config.height), 'star');
                            star.setScale(2)
                            const dx = this.dude.x - star.x;
                            const dy = this.dude.y - star.y;

                            const angle = Math.atan2(dy, dx);

                            star.body.velocity.x = Math.cos(angle) * gameOptions.bulletSpeed*1.1;
                            star.body.velocity.y = Math.sin(angle) * gameOptions.bulletSpeed*1.1;

                            star.body.allowGravity = false;
                            if (i >= 14) {
                                this.star_ascent();
                            }
                        }
                    }, [], this); 
                }

            }, [], this);
        }
    }
    star_ascent() {
        if(this.can_attack) {
            this.time.delayedCall(1000, () => {
                for(let i = 0; i < 100; i++) {
                    this.time.delayedCall(i*100, () => {
                        if(this.can_attack) {
                            this.shot.play({
                                loop: false,
                                volume: 2
                            });

                            let star;
                            star = this.starsGroup.create(Phaser.Math.Between(0, game.config.width), game.config.height, 'star');
                            star.body.velocity.y = -gameOptions.bulletSpeed*1;

                            star.body.allowGravity = false;

                
                            if (i >= 99) {
                                this.star_wave_attack();
                            }
                        }
                    }, [], this);
                }
            }, [], this);
        }
    }
     // The boss spawns two waves of stars
    star_wave_attack() {
        if(this.can_attack) {
            this.time.delayedCall(1000, () => {
                for(let i = 0; i < 100; i++) {
                    this.time.delayedCall(i*100, () => {
                        if(this.can_attack) {
                            this.shot.play({
                                loop: false,
                                volume: 2
                            });

                            let star;
                            let star2;
                            star = this.starsGroup.create(this.star_boss.x-20, this.star_boss.y-300, 'star');
                            star2 = this.starsGroup.create(this.star_boss.x-20, this.star_boss.y+300, 'star');
                            star.body.velocity.x = -gameOptions.bulletSpeed*0.55;
                            star2.body.velocity.x = -gameOptions.bulletSpeed*0.55;
                        }
                    }, [], this);
                }
            }, [], this);

            // Start the attack cycle again after this cycle has finished
            this.time.delayedCall(11000, () => {
                this.triggerTimer = this.time.addEvent({
                    callback: this.homing_star_attack,
                    callbackScope: this,
                    delay: 0,
                    loop: false
                });
            }, [], this);
        }
    }
    spawn_random360() {
        if(this.can_attack) {
            this.time.delayedCall(1000, () => {
                let center_star;
                center_star = this.starsGroup.create(game.config.width*0.6, game.config.height*0.5, 'star');
                center_star.setScale(2);

                for(let i = 0; i < 10000; i++) {
                    this.time.delayedCall(i*200, () => {
                        if(this.can_attack) {
                            this.shot.play({
                                loop: false,
                                volume: 2
                            });

                            let star;
                            star = this.starsGroup.create(game.config.width*0.6, game.config.height*0.5, 'star');
                            let randomAngle = Phaser.Math.Angle.Random();

                            // Calculate velocity components using trigonometry
                            let velocityX = Math.cos(randomAngle) * gameOptions.bulletSpeed*0.5;
                            let velocityY = Math.sin(randomAngle) * gameOptions.bulletSpeed*0.5;

                            // Apply the velocity to the star
                            star.body.velocity.x = velocityX;
                            star.body.velocity.y = velocityY;
                        }
   
                    }, [], this);
                }
            }, [], this);
        }
    }

    getStarred(dude, star) {
        this.metal_hit.play({
            loop: false,
            volume: 2
        });
        star.disableBody(true, true)
        this.playerhealth -= 1
        this.healthText.setText(this.playerhealth)
    }
    dudeHitSpike(dude, spike) {
        this.crush.play({
            loop: false,
            volume: 2
        });
        this.playerhealth = 0
        this.healthText.setText(this.playerhealth)
    }
    getHeavyStarred(dude, grey_star) {
        this.playerhealth = 0
        this.healthText.setText(this.playerhealth)
    }

    bulletHitGround(bullet) {
        bullet.disableBody(true, true)
        bullet.destroy();
        this.bulletsOnScreen -= 1;
    }

    bulletHitBoss(star_boss, bullet) {
        if (!star_boss.active) {
            return;
        }

        bullet.disableBody(true, true)
        bullet.destroy();
        this.bulletsOnScreen -= 1;
        this.bossHealth -= 1;

        this.bossHealthBar.setScale((20/this.bossMaxHealth)*this.bossHealth,2);
        this.bossHealthText.setText("BOSS HP: " + this.bossHealth)

        if (this.bossHealth <= 0) {
            this.hurt_star = this.add.image(star_boss.x, star_boss.y, "hurt_star")
            this.hurt_star.setScale(7);

            this.tweens.killTweensOf(star_boss);
            star_boss.body.setEnable(false);
            this.physics.world.disable(star_boss);
    
            star_boss.setActive(false).setVisible(false);
    
            // Prevent any future interaction with grey_star after destruction
            star_boss.destroy();

            this.final_animation(this.hurt_star);

        } else {
            this.time.delayedCall(5, () => {
                this.boss_hit.play({
                    loop: false,
                    volume: 1
                });
            }, [], this);

            

            this.star_boss.setTexture('damaged_star');
            this.time.delayedCall(100, () => {
                if (star_boss && star_boss.active) {
                    star_boss.setTexture('star');
                }
            }, [], this);
        }
    }

    bulletHitGreyStar(bullet, grey_star) {
        if (!grey_star.active) {
            return; // If grey_star is not active, do nothing
        }
        
        bullet.disableBody(true, true);
        bullet.destroy();
        this.bulletsOnScreen -= 1;
        this.greyStarHealth -= 1;
    
        if (this.greyStarHealth <= 0) {
            this.crush.play({
                loop: false,
                volume: 2
            });
    
            // Ensure all tweens or events related to grey_star are killed before destruction
            this.tweens.killTweensOf(grey_star);
            grey_star.body.setEnable(false);
            this.physics.world.disable(grey_star);
    
            grey_star.setActive(false).setVisible(false);
    
            // Prevent any future interaction with grey_star after destruction
            grey_star.destroy();
            this.greyStarHealth = 25;
    
        } else {
            this.time.delayedCall(5, () => {
                this.metal_hit.play({
                    loop: false,
                    volume: 2
                });
            }, [], this);
    
            // Safeguard delayed call with a check if grey_star is still valid
            grey_star.setTexture('damaged_grey_star');
            this.time.delayedCall(100, () => {
                if (grey_star && grey_star.active) { // Only set texture if grey_star still exists and is active
                    grey_star.setTexture('grey_star');
                }
            }, [], this);
        }
    }
    
    final_animation(hurt_star) {
        this.crush.play({
            loop: false,
            volume: 6
        });
        this.metal_hit.play({
            loop: false,
            volume: 7
        });
        this.time.delayedCall(2500, () => {
        

            this.haaa.play({
                loop: false,
                volume: 1
            });

            // Background light fade in
            let background_light = this.add.image(game.config.width / 2, game.config.height / 2, "boss_hp");
            background_light.setScale(100);
            background_light.setAlpha(0); 
            background_light.setDepth(1);
    
            this.tweens.add({
                targets: background_light,
                alpha: 1, 
                duration: 5000,
                ease: 'Cubic.easeIn',
            });

            // Beams of light from the boss
            for(let i = 0; i < 40; i++) {
                this.time.delayedCall(i*200, () => {
                    this.crush.play({
                        loop: false,
                        volume: 4
                    });
                    let final_light = this.add.image(hurt_star.x, hurt_star.y, "boss_hp");
                    final_light.setScale(100, 2);
                    final_light.setDepth(-1);
                    final_light.setAlpha(0.6); 
                    final_light.rotation = Phaser.Math.Between(0, 360) * (Math.PI / 180);
                }, [], this);
            
            }
        }, [], this);

    }

    update() {
        // Handle player movement
        if (this.cursors.left.isDown) {
            this.dude.body.velocity.x = -gameOptions.dudeSpeed
            this.dude.anims.play("left", true)
            this.facingRight = false; // Player is facing left
        
        } else if (this.cursors.right.isDown) {
            this.dude.body.velocity.x = gameOptions.dudeSpeed
            this.dude.anims.play("right", true)
            this.facingRight = true; // Player is facing right
        
        } else {
            this.dude.body.velocity.x = 0
            if (this.facingRight) {
                this.dude.anims.play("halt_right", true)
            } else {
                this.dude.anims.play("halt_left", true)
            }
        }

        // Jump and double jump logic
        if (Phaser.Input.Keyboard.JustDown(this.jumpKey) || Phaser.Input.Keyboard.JustDown(this.jumpKey_2)) {
            if (this.dude.body.touching.down) {
                this.dude.body.velocity.y = -600; // Perform first jump
                this.jump.play({
                    loop: false,
                    volume: 3
                });
                this.doubleJump = true;
            } 
            else if (this.doubleJump) {
                this.dude.body.velocity.y = -600; // Perform double jump
                this.jump.play({
                    loop: false,
                    volume: 3
                });
                this.doubleJump = false; 
            }
        }

        if (this.dude.body.touching.down) {
            this.doubleJump = true;
        }

        // Shooting with X
        if ((Phaser.Input.Keyboard.JustDown(this.shootKey) || Phaser.Input.Keyboard.JustDown(this.shootKey_2)) && this.bulletsOnScreen < this.bulletCap) {
            this.shoot();
            if (this.facingRight) {
                this.dude.anims.play("shoot_right", true)
            }
            else {
                this.dude.anims.play("shoot_left", true)
            }
            this.bulletsOnScreen += 1
        }

        if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
            this.refreshScreen()
        }

        // Remove bullets and stars when they leave the screen
        this.bulletGroup.children.each((bullet) => {
            if (bullet.x > game.config.width || bullet.x < 0) {
                bullet.destroy(); // Destroy bullets when they go off-screen
                this.bulletsOnScreen -= 1; // Decrease bullet count
            }
        }, this);

        this.starsGroup.children.each((star) => {
            if (star.x > game.config.width || star.x < 0) {
                star.destroy();
            }
        }, this);

        // Game end conditions
        if (this.dude.y > game.config.height || this.dude.y < 0) {
            this.backgroundMusic.stop();
            this.death_sound.play({
                loop: false,
                volume: 1
            });
            this.scene.start("EndGame")
        }
        if (this.playerhealth <= 0) {
            this.backgroundMusic.stop();
            this.death_sound.play({
                loop: false,
                volume: 1
            });
            this.scene.start("EndGame")
        }
        if (this.bossHealth <= 0) {

            this.backgroundMusic.stop();
            this.can_attack = false;
            
            for(let i = 0; i < 12; i++) {
                this.time.delayedCall(i*1000, () => {
                    if (i >= 11) {
                        //this.scene.start("WinGame")
                        this.scene.start('NextStage', { 
                            playerHealth: this.playerhealth,
                        })
                    }
                }, [], this);
                
            }
            
        }
    }
}

class EndGame extends Phaser.Scene {
    constructor() {
        super("EndGame")
    }
    preload() {
        this.load.audio('death_music', 'assets/sound/Death_music.mp3');
    }
    create() {

        this.death_music = this.sound.add('death_music');
    
        this.death_music.play({
            loop: true,
            volume: 10
        });

        this.failtext = this.add.text(game.config.width*0.25, game.config.height*0.20, "You died. It happens. And will happen again.", {fontSize: "30px", fill: "#ffffff"})
        this.instructiontext = this.add.text(game.config.width*0.32, game.config.height*0.30, "Refresh page (R) to try again.", {fontSize: "30px", fill: "#808080"})
        this.instructiontext2 = this.add.text(game.config.width*0.3, game.config.height*0.40, "Oh, right. The controls are:", {fontSize: "30px", fill: "#808080"})
        this.instructiontext3 = this.add.text(game.config.width*0.3, game.config.height*0.45, "'Left' and 'right' for movement", {fontSize: "30px", fill: "#808080"})
        this.instructiontext4 = this.add.text(game.config.width*0.3, game.config.height*0.50, "'Z' or 'UP' for jump", {fontSize: "30px", fill: "#808080"})
        this.instructiontext5 = this.add.text(game.config.width*0.3, game.config.height*0.55, "'X' or 'SPACE' for shoot", {fontSize: "30px", fill: "#808080"})
        this.instructiontext5 = this.add.text(game.config.width*0.3, game.config.height*0.60, "'R' to reset screen", {fontSize: "30px", fill: "#808080"})
        this.instructiontext5 = this.add.text(game.config.width*0.3, game.config.height*0.70, "You can double jump and you can", {fontSize: "30px", fill: "#808080"})
        this.instructiontext5 = this.add.text(game.config.width*0.3, game.config.height*0.75, "shoot max 5 bullets at a time.", {fontSize: "30px", fill: "#808080"})
        
        this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    }
    refreshScreen() {
        window.location.reload();
    }
    update() {
        if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
            this.refreshScreen()
        }
    }
}
class WinGame extends Phaser.Scene {
    constructor() {
        super("WinGame")
    }
    preload() {
        this.load.image("star", "assets/star.png")
        this.load.audio('victory', 'assets/sound/victory.mp3');
    }
    create() {
        this.backgroundMusic = this.sound.add('victory');
    
        this.backgroundMusic.play({
            loop: false,
            volume: 3
        });

        this.wintext = this.add.text(game.config.width*0.42, game.config.height*0.45, "You're winner!", {fontSize: "30px", fill: "#ffffff"})
        this.instructiontext = this.add.text(game.config.width*0.32, game.config.height*0.55, "Refresh page (R) to play again.", {fontSize: "30px", fill: "#808080"})

        this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)

        
        this.add.image(game.config.width*0.5, game.config.height*0.25, "star").setScale(10)
    }
    refreshScreen() {
        window.location.reload();
    }
    update() {
        if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
            this.refreshScreen()
        }
    }
}

class NextStage extends Phaser.Scene {

    constructor() {
        super("NextStage")
        this.bulletCap = 5;
        this.facingRight = true;
        this.bulletsOnScreen = 0;
        this.boss_timer = 35;
        this.can_attack = true;
        this.bossHealth = 100;
    }
    init(data) {
        this.playerHealth = data.playerHealth;
    }
    preload() {
        this.load.image("ground", "assets/platform.png");
        this.load.image("star", "assets/star.png");
        this.load.spritesheet("dude", "assets/dude.png", {frameWidth: 32, frameHeight: 48});
        this.load.spritesheet("bullet", "assets/bullet.png", {frameWidth: 1080, frameHeight: 1080, scale: 0.01});
        this.load.image("damaged_star", "assets/damaged_star.png");
        this.load.image("hurt_star", "assets/hurt_star.png");
        this.load.image("grey_star", "assets/star_enemy.png");
        this.load.image("damaged_grey_star", "assets/star_enemy_damaged.png");
        this.load.image("spike_down", "assets/spike_down.png");
        this.load.image("boss_hp", "assets/boss_hp.png");
        this.load.image("boss_time", "assets/boss_time.png");
        this.load.image("norppa", "assets/norppa.png");
        this.load.image("sponge", "assets/sponge.png");
        this.load.image("enemy_dude", "assets/enemy_dude.png");
        this.load.image("shot_glass", "assets/shot_glass.png");
        this.load.image("light_beam", "assets/beam.png");
        this.load.image("targetted", "assets/targetted.png");

        this.load.audio('music', 'assets/sound/Background_music.mp3');
        this.load.audio('viiksekkaita', 'assets/sound/viiksekaitaSong.mp3');
        this.load.audio('gun', 'assets/sound/gun.mp3');
        this.load.audio('shot', 'assets/sound/shot.mp3');
        this.load.audio('metal_hit', 'assets/sound/metal_hit.mp3');
        this.load.audio('crush', 'assets/sound/crush.mp3');
        this.load.audio('boss_hit', 'assets/sound/boss_hit.mp3');
        this.load.audio('entrance', 'assets/sound/entrance.mp3');
        this.load.audio('death_sound', 'assets/sound/death_sound.mp3');
        this.load.audio('jump', 'assets/sound/jump.mp3');
        this.load.audio('crack', 'assets/sound/norppaEats.mp3');
        this.load.audio('hawk', 'assets/sound/hawk.mp3');
        this.load.audio('failoof', 'assets/sound/failoof.mp3');
        this.load.audio('Epic_finale_theme', 'assets/sound/Epic_finale_theme.mp3');
    }
    
    create() {

        // Music and sound effects
        this.backgroundMusic = this.sound.add('music');
        this.viiksekaita = this.sound.add('viiksekkaita');

        this.crush = this.sound.add('crush');
        this.gun = this.sound.add('gun');
        this.shot = this.sound.add('shot');
        this.metal_hit = this.sound.add('metal_hit');
        this.boss_hit = this.sound.add('boss_hit');
        this.entrance = this.sound.add('entrance');
        this.death_sound = this.sound.add('death_sound');
        this.jump = this.sound.add('jump');
        this.crack = this.sound.add('crack');
        this.hawk = this.sound.add('hawk');
        this.failoof = this.sound.add('failoof');
        this.Epic_finale_theme = this.sound.add('Epic_finale_theme');

        // Re-create platforms (Some initially inactive and invisible)
        this.groundGroup = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })
        this.middle_platform = this.groundGroup.create(game.config.width*0.5, game.config.height*0.9, "ground")
        this.middle_platform.setScale(4,7);

        this.left_platform = this.groundGroup.create(game.config.width*0.25, game.config.height*0.62, "ground")
        this.left_platform.setActive(0).disableBody(0).setVisible(0);

        this.left_platform_2 = this.groundGroup.create(game.config.width*0.1, game.config.height*0.45, "ground")
        this.left_platform_2.setActive(0).disableBody(0).setVisible(0);

        this.right_platform = this.groundGroup.create(game.config.width*0.75, game.config.height*0.62, "ground")
        this.right_platform.setActive(0).disableBody(0).setVisible(0);
        
        this.right_platform_2 = this.groundGroup.create(game.config.width*0.9, game.config.height*0.45, "ground")
        this.right_platform_2.setActive(0).disableBody(0).setVisible(0);
        
        // Spikes (76 for the top of the screen)
        this.spikeGroup = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })
        for(let i = 0; i < 76; i++) {
            this.spikeGroup.create(i*20, 5, "spike_down")
        }
        
        // Re-create player
        this.dude = this.physics.add.sprite(game.config.width*0.5, game.config.height*0.75, "dude")
        this.dude.body.gravity.y = gameOptions.dudeGravity;
        this.physics.add.collider(this.dude, this.groundGroup)

        // Target follow
        this.target = this.physics.add.sprite(game.config.width*0.5, game.config.height*0.75, "targetted")
        this.target.setScale(0.15).setVisible(0)

        // Re-create bullets group
        this.bulletGroup = this.physics.add.group({
            maxSize: this.bulletCap
        })
        this.physics.add.overlap(this.bulletGroup, this.groundGroup, this.bulletHitGround, null, this)

        // Setup norppas
        this.norppaGroup = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.norppaGroup, this.getNorppad, null, this)

        // Setup stars (These are now the enemy bullets)
        this.starsGroup = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.starsGroup, this.getStarred, null, this)

        // Add health display
        this.add.image(16, 43, "star")
        this.healthText = this.add.text(32, 30, this.playerHealth, {fontSize: "30px", fill: "#ffffff"})

        // Darken background by adding a semi-transparent black overlay
        this.darkBackground = this.add.rectangle(0, 0, game.config.width, game.config.height, 0x000000, 0.6);
        this.darkBackground.setOrigin(0, 0);
        this.darkBackground.setDepth(-2);  // Ensure it is on top of the background but below the attacks
        this.darkBackground.setAlpha(0)

        this.lightBeam1 = this.add.sprite(game.config.width * 0.45, game.config.height * 0, 'light_beam').setScale(1, 1).setOrigin(0.5, 0);
        this.lightBeam2 = this.add.sprite(game.config.width * 0.55, game.config.height * 0, 'light_beam').setScale(1, 1).setOrigin(0.5, 0);

        // Set initial visibility and depth for the beams
        this.lightBeam1.setAlpha(0.3).setDepth(-1);
        this.lightBeam2.setAlpha(0.3).setDepth(-1);
        this.lightBeam1.setVisible(0);
        this.lightBeam2.setVisible(0);

        // Create tweens to move light beams horizontally
        this.tweens.add({
            targets: this.lightBeam1,
            scaleX: { from: 0.5, to: 2 },  // Scaling only the width (horizontal stretch) to simulate horizontal movement of the bottom part
            duration: 3000,
            repeat: -1,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });

        this.tweens.add({
            targets: this.lightBeam2,
            scaleX: { from: 3, to: 0.8 },  // Scaling in the opposite direction to create alternating motion
            duration: 3000,
            repeat: -1,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });

        this.tweens.add({
            targets: this.darkBackground,
            alpha: 0.6, 
            duration: 5000,
            ease: 'Cubic.easeIn',
        });


        // BOSS 
        this.star_bossGroup = this.physics.add.group({})
        this.physics.add.overlap(this.bulletGroup, this.star_bossGroup, this.bulletHitBoss, null, this);
        this.physics.add.overlap(this.dude, this.star_bossGroup, this.dudeHitBoss, null, this);
        this.starBoss = this.star_bossGroup.create(game.config.width*0.5, game.config.height*0.4, 'hurt_star');
        this.starBoss.setScale(7);
        this.starBoss.setVisible(0);
        this.starBoss.setActive(0);
        
        // Boss health bar
        this.bossMaxHealth = this.bossHealth;
        this.bossHealthBar = this.add.image(0, game.config.height-10, "boss_hp")
        this.bossHealthBar.setScale(20,2);
        this.bossHealthBar.setVisible(0)

        // Boss health text
        this.bossHealthText = this.add.text(game.config.width*0.85, 20, "BOSS HP: " + this.bossHealth, {fontSize: "30px", fill: "#ffffff"})
        this.bossHealthText.setVisible(0)

        // Boss time bar
        this.bossTimeBar = this.add.image(0, 10, "boss_time")
        this.bossTimeBar.setScale(20,2);
        

        // Three wise men :)
        this.man_1 = this.add.image(game.config.width*0.1, 0, "enemy_dude")
        this.man_2 = this.add.image(0, game.config.height*0.2, "enemy_dude")
        this.man_3 = this.add.image(game.config.width*0.9, 0, "enemy_dude")
        this.man_1.setVisible(0)
        this.man_2.setVisible(0)
        this.man_3.setVisible(0)

        this.tweens.add({
            targets: this.man_1,
            y: { 
                from: game.config.height*0.15,
                to: game.config.height*0.8
            },
            duration: 3500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1 
        })
        
        this.tweens.add({
            targets: this.man_2,
            x: { 
                from: game.config.width*0.4,
                to: game.config.width*0.6
            },
            duration: 3000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1 
        })

        this.tweens.add({
            targets: this.man_3,
            y: { 
                from: game.config.height*0.8,
                to: game.config.height*0.2
            },
            duration: 4000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1 
        })


        // MOVEMENT
        // Cursor keys
        this.cursors = this.input.keyboard.createCursorKeys()
        
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
        this.shootKey_2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

        this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
        this.jumpKey_2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
        
        this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
        // Turning to left and left movement
        this.anims.create({
            key: "left",
            frames: this.anims.generateFrameNumbers("dude", {start: 0, end: 3}),
            frameRate: 10,
            repeat: -1
        })

        this.anims.create({
            key: "halt_left",
            frames: [{key: "dude", frame: 2}],
            frameRate: 10,
        })

        this.anims.create({
            key: "shoot_left",
            frames: [{key: "dude", frame: 0}],
            frameRate: 10,
            repeat: -1
        })

        
        // Turning to right and right movement
        this.anims.create({
            key: "right",
            frames: this.anims.generateFrameNumbers("dude", {start: 5, end: 9}),
            frameRate: 10,
            repeat: -1
        })

        this.anims.create({
            key: "halt_right",
            frames: [{key: "dude", frame: 5}],
            frameRate: 10,
        })

        this.anims.create({
            key: "shoot_right",
            frames: [{key: "dude", frame: 7}],
            frameRate: 10,
            repeat: -1
        })

        this.triggerTimer = this.time.addEvent({
            callback: this.timerTickDown,
            callbackScope: this,
            delay: 3000, // Updates every second
            loop: false
        })

        this.triggerTimer = this.time.addEvent({
            callback: this.finalBattle,
            callbackScope: this,
            delay: 3000, // Updates every second
            loop: false
        })
    }

    // Function to handle shooting
    shoot() {

        this.gun.play({
            loop: false,
            volume: 0.8
        });

        let bullet;
        if (this.facingRight) {
            bullet = this.bulletGroup.create(this.dude.x + 20, this.dude.y+10, 'bullet');
        } else {
            bullet = this.bulletGroup.create(this.dude.x - 20, this.dude.y+10, 'bullet');
        }
        
        bullet.setScale(0.05);
        
        if (this.facingRight) {
            bullet.body.velocity.x = gameOptions.bulletSpeed;
        } else {
            
            bullet.body.velocity.x = -gameOptions.bulletSpeed;
        }
        bullet.body.allowGravity = false; 
    }

    refreshScreen() {
        window.location.reload();
    }

    bulletHitGround(bullet) {
        bullet.disableBody(true, true)
        bullet.destroy();
        this.bulletsOnScreen -= 1;
    }
    dudeHitBoss(dude, star_boss) {
        if (star_boss.active) {
            this.playerHealth = 0;
        }
        console.log("lol you died.")
    }

    bulletHitBoss(bullet, star_boss) {
        if (!star_boss.active) {
            return;
        }
        bullet.disableBody(true, true)
        bullet.destroy();
        this.bulletsOnScreen -= 1;
        this.bossHealth -= 1;

        this.bossHealthBar.setScale((20/this.bossMaxHealth)*this.bossHealth,2);
        this.bossHealthText.setText("BOSS HP: " + this.bossHealth)

        // Attack in retaliation
        this.star_defense();

        if (this.bossHealth <= 0) {
            this.crush.play({
                loop: false,
                volume: 2
            });
    
    
        } else {
            this.time.delayedCall(1, () => {
                this.boss_hit.play({
                    loop: false,
                    volume: 2
                });
            }, [], this);
    
            // Safeguard delayed call with a check if grey_star is still valid
            star_boss.setTexture('damaged_star');
            this.time.delayedCall(100, () => {
                if (star_boss && star_boss.active) { // Only set texture if grey_star still exists and is active
                    star_boss.setTexture('hurt_star');
                }
            }, [], this);
        }
    }


    getNorppad(dude, norppa) {
        this.crack.play({
            loop: false,
            volume: 1
        });
        norppa.disableBody(true, true)
        this.playerHealth -= 1
        this.healthText.setText(this.playerHealth)
    }

    getStarred(dude, star) {
        this.metal_hit.play({
            loop: false,
            volume: 2
        });
        star.disableBody(true, true)
        this.playerHealth -= 1
        this.healthText.setText(this.playerHealth)
    }

    // Tick down for 120 seconds
    timerTickDown() {
        const boss_max_timer = this.boss_timer;
        for(let i = 0; i < boss_max_timer; i++) {
            this.time.delayedCall(i*1000, () => {
                this.boss_timer -= 1;
                this.bossTimeBar.setScale((20/boss_max_timer)*this.boss_timer,2);
            }, [], this);
        }
    }

    norppa_attack() {
        if(this.can_attack) {
            
            this.time.delayedCall(1000, () => {
                for(let i = 0; i < 10; i++) {
                    this.time.delayedCall(i*1000, () => {
                        if(this.can_attack) {

                            this.shot.play({
                                loop: false,
                                volume: 2
                            });

                            let norppa;
                            norppa = this.norppaGroup.create((i%2)*game.config.width, game.config.height*0.7, 'norppa');
                            norppa.setScale(0.3,0.3)
                            const dx = this.dude.x - norppa.x;
                            const dy = this.dude.y - norppa.y;

                            const angle = Math.atan2(dy, dx);

                            norppa.body.velocity.x = Math.cos(angle) * gameOptions.bulletSpeed*1.3;
                            norppa.body.velocity.y = Math.sin(angle) * gameOptions.bulletSpeed*1.3;
                            norppa.body.allowGravity = false;
                            norppa.body.setImmovable(true);
                        }
                        }, [], this); 
                }
            }, [], this);
        }
    }

    norppa_attack_2() {
        if(this.can_attack) {
            
            this.time.delayedCall(1000, () => {
                for(let i = 0; i < 20; i++) {
                    this.time.delayedCall(i*50, () => {
                        if(this.can_attack) {
                            this.shot.play({
                                loop: false,
                                volume: 2
                            });

                            let norppa;
                            norppa = this.norppaGroup.create(Phaser.Math.Between(0, game.config.width), 0, 'norppa');
                            norppa.setScale(0.2,0.2)
                            const dx = this.dude.x - norppa.x;
                            const dy = this.dude.y - norppa.y;

                            const angle = Math.atan2(dy, dx);

                            norppa.body.velocity.x = Math.cos(angle) * gameOptions.bulletSpeed*1.2;
                            norppa.body.velocity.y = Math.sin(angle) * gameOptions.bulletSpeed*1.2;
                            norppa.body.allowGravity = false;
                            norppa.body.setImmovable(true);
                        }
                        }, [], this); 
                }
            }, [], this);
        }
    }

    norppa_attack_3(x,y) {
        if(this.can_attack) {
            
            this.time.delayedCall(1000, () => {
                for(let i = 0; i < 11; i++) {
                    this.time.delayedCall(i, () => {
                        if(this.can_attack) {
                            this.shot.play({
                                loop: false,
                                volume: 2
                            });

                            let norppa;
                            norppa = this.norppaGroup.create(x, y, 'norppa');
                            norppa.setScale(0.1,0.1)

                            norppa.body.velocity.x = Math.cos(i*36) * gameOptions.bulletSpeed*1.2;
                            norppa.body.velocity.y = Math.sin(i*36) * gameOptions.bulletSpeed*1.2;
                            norppa.body.allowGravity = false;
                            norppa.body.setImmovable(true);
                        }
                        }, [], this); 
                }
            }, [], this);
        }
    }

    sponge_attack() {
        if(this.can_attack) {
            
            this.time.delayedCall(1000, () => {
            
                if(this.can_attack) {
                    this.hawk.play({
                        loop: false,
                        volume: 0.1
                    });

                    let sponge;
                    sponge = this.norppaGroup.create(Phaser.Math.Between(game.config.width*0.3, game.config.width*0.7), 0, 'sponge');
                    sponge.setScale(1.5,1.5)

                    sponge.body.velocity.x = 0
                    sponge.body.velocity.y = gameOptions.bulletSpeed*1.5;
                    sponge.body.allowGravity = false;
                    sponge.body.setImmovable(true);
                }
            }, [], this); 
        }
    }

    beer_shots_attack(man) {
        if(this.can_attack) {
            
            this.time.delayedCall(1000, () => {
                for(let i = 0; i < 11; i++) {
                    this.time.delayedCall(i*Phaser.Math.Between(1000, 1400), () => {
                        if(this.can_attack) {
                            this.failoof.play({
                                loop: false,
                                volume: 0.5
                            });

                            let shot_glass;
                            shot_glass = this.norppaGroup.create(man.x, man.y, 'shot_glass');
                            shot_glass.setScale(0.05,0.05)
                            const dx = this.dude.x - shot_glass.x + Phaser.Math.Between(-20, 20);
                            const dy = this.dude.y - shot_glass.y + Phaser.Math.Between(-20, 20);

                            const angle = Math.atan2(dy, dx);

                            shot_glass.body.velocity.x = Math.cos(angle) * gameOptions.bulletSpeed*1.2;
                            shot_glass.body.velocity.y = Math.sin(angle) * gameOptions.bulletSpeed*1.2;
                            shot_glass.body.allowGravity = false;
                            shot_glass.body.setImmovable(true);
                        }
                        }, [], this); 
                }
            }, [], this);
        }
    }

    // The boss shoots a star at player when hit the amount depends on the hitpoints of the boss
    star_defense() {
        if(this.can_attack) {
            this.time.delayedCall(10, () => {
                for(let i = 0; i < 5-(this.bossHealth/20); i++) {
                    this.time.delayedCall(i*100, () => {
                        if(this.can_attack) {
                            this.shot.play({
                                loop: false,
                                volume: 2
                            });

                            let star;
                            const ver_hor = Phaser.Math.Between(0,1);
                            const dir_val = Phaser.Math.Between(0,1);

                            if (ver_hor == 1) {
                                let x_vel = 1;
                                if (dir_val == 1) {
                                    x_vel = -1;
                                    star = this.starsGroup.create(game.config.width, Phaser.Math.Between(game.config.height*0.2, game.config.height*0.8), 'star');
                                } else {
                                    star = this.starsGroup.create(0, Phaser.Math.Between(game.config.height*0.2, game.config.height*0.8), 'star');
                                }

                                star.body.velocity.x = gameOptions.bulletSpeed*0.3*x_vel;
                                star.body.velocity.y = Phaser.Math.Between(-100,100);

                            } else {
                                let y_vel = 1;
                                if (dir_val == 1) {
                                    y_vel = -1;
                                    star = this.starsGroup.create(Phaser.Math.Between(0, game.config.width), game.config.height, 'star');
                                } else {
                                    star = this.starsGroup.create(Phaser.Math.Between(0, game.config.width), 0, 'star');
                                }
                                star.body.velocity.x = Phaser.Math.Between(-100,100);
                                star.body.velocity.y = gameOptions.bulletSpeed*0.3*y_vel;
                            }
                            
                            star.setScale(1)
                            star.body.allowGravity = false;
                        }
                        }, [], this); 
                }
            }, [], this);
        }
    }

    // Forever loop 360 attack
    spawn_random360() {
        if(this.can_attack) {
            this.time.delayedCall(1000, () => {

                for(let i = 0; i < 100; i++) {
                    this.time.delayedCall(i*500, () => {
                        if(this.can_attack) {

                            let star;
                            star = this.starsGroup.create(this.starBoss.x, this.starBoss.y, 'star');
                            let randomAngle = Phaser.Math.Angle.Random();

                            // Calculate velocity components using trigonometry
                            let velocityX = Math.cos(randomAngle) * gameOptions.bulletSpeed*0.3;
                            let velocityY = Math.sin(randomAngle) * gameOptions.bulletSpeed*0.3;

                            // Apply the velocity to the star
                            star.body.velocity.x = velocityX;
                            star.body.velocity.y = velocityY;

                            star.setScale(0.5);
                            if (i >= 99) {
                                this.spawn_random360();
                            }
                        }
                        
                    }, [], this);
                }
            }, [], this);
        }
    }
    
    spawn_fixed_360(x,y,count) {
        if(this.can_attack) {
            this.time.delayedCall(2000, () => {
                for(let k = 0; k < count; k++) {

                    this.time.delayedCall(2000*k, () => {
                        for(let i = 0; i < 15; i++) {
                            this.time.delayedCall(i, () => {
                                if(this.can_attack) {

                                    let star;
                                    star = this.starsGroup.create(x, y, 'star');

                                    star.body.velocity.x = Math.cos(i*18+k*7) * gameOptions.bulletSpeed*0.2;
                                    star.body.velocity.y = Math.sin(i*18+k*7) * gameOptions.bulletSpeed*0.2;
                                    star.body.allowGravity = false;
                                    star.body.setImmovable(true);

                                    star.setScale(0.5);
                            
                                }
                                }, [], this); 
                        }
                    }, [], this);
                }

                this.time.delayedCall(2000*count, () => {
                    this.star_spray();
                }, [], this);
            }, [], this);
        }
    }

    spawn_360_intro() {
        if(this.can_attack) {
            for(let k = 0; k < 3; k++) {

                this.time.delayedCall(200*k, () => {
                    for(let i = 0; i < 20; i++) {
                        this.time.delayedCall(i, () => {
                            if(this.can_attack) {

                                let star;
                                star = this.starsGroup.create(this.starBoss.x, this.starBoss.y, 'star');

                                star.body.velocity.x = Math.cos(i*18+k*7) * gameOptions.bulletSpeed*0.2;
                                star.body.velocity.y = Math.sin(i*18+k*7) * gameOptions.bulletSpeed*0.2;
                                star.body.allowGravity = false;
                                star.body.setImmovable(true);
                            
                            }
                            }, [], this); 
                    }
                }, [], this);
            }
        }
    }

    stars_float_too() {

        console.log("Stars are floating");
        const max = 100;

        if(this.can_attack) {
            this.time.delayedCall(2000, () => {
                for(let i = 0; i < max; i++) {
                    this.time.delayedCall(i*300, () => {
                        if(this.can_attack) {

                            let star;
                            const ver_hor = Phaser.Math.Between(0,1);
                            const dir_val = Phaser.Math.Between(0,1);

                            if (ver_hor == 1) {
                                let x_vel = 1;
                                if (dir_val == 1) {
                                    x_vel = -1;
                                    star = this.starsGroup.create(game.config.width, Phaser.Math.Between(game.config.height*0.2, game.config.height*0.8), 'star');
                                } else {
                                    star = this.starsGroup.create(0, Phaser.Math.Between(game.config.height*0.2, game.config.height*0.8), 'star');
                                }

                                star.body.velocity.x = gameOptions.bulletSpeed*0.1*x_vel;
                                star.body.velocity.y = Phaser.Math.Between(-100,100);

                            } else {
                                let y_vel = 1;
                                if (dir_val == 1) {
                                    y_vel = -1;
                                    star = this.starsGroup.create(Phaser.Math.Between(0, game.config.width), game.config.height, 'star');
                                } else {
                                    star = this.starsGroup.create(Phaser.Math.Between(0, game.config.width), 0, 'star');
                                }
                                star.body.velocity.x = Phaser.Math.Between(-100,100);
                                star.body.velocity.y = gameOptions.bulletSpeed*0.1*y_vel;
                            }
                            
                            star.setScale(0.5)
                            star.body.allowGravity = false;

                            if (i >= max-1) {
                                this.spawn_fixed_360(this.starBoss.x, this.starBoss.y, 20);
                            }
                        }
                        }, [], this); 
                }
            }, [], this);
        }
    }

    // The boss Shoots ten stars at the players current position
    star_spray() {
        if(this.can_attack) {
            this.target.setVisible(1)
            this.time.delayedCall(2000, () => {
                for(let i = 0; i < 100; i++) {
                    this.time.delayedCall(i*50, () => {
                        if(this.can_attack) {

                            this.shot.play({
                                loop: false,
                                volume: 2
                            });

                            let star;
                            star = this.starsGroup.create(this.starBoss.x, this.starBoss.y, 'star');
                            star.setScale(2)
                            const dx = this.dude.x - star.x;
                            const dy = this.dude.y - star.y;

                            const angle = Math.atan2(dy, dx);

                            star.body.velocity.x = Math.cos(angle) * gameOptions.bulletSpeed*0.7;
                            star.body.velocity.y = Math.sin(angle) * gameOptions.bulletSpeed*0.7;

                            star.body.allowGravity = false;
                            if (i >= 99) {
                                this.target.setVisible(0)
                                this.stars_float_too();
                            }
                        }
                        }, [], this); 
                }
            }, [], this);
        }
    }

    // The boss rains down spikes
    spike_rain(mod) {
        if(this.can_attack) {
            this.time.delayedCall(1000, () => {
                for(let i = 0; i < 100; i++) {
                    this.time.delayedCall(i*1000/mod, () => {
                        if(this.can_attack) {

                            let star;
                            star = this.starsGroup.create(Phaser.Math.Between(this.dude.x-500, this.dude.x+500), 0, 'spike_down');
                            star.body.velocity.y = gameOptions.bulletSpeed*0.8;

                            star.body.allowGravity = false;

                
                            if (i >= 99) {
                                this.spike_rain(mod+1);
                            }
                        }
                    }, [], this);
                }
            }, [], this);
        }
    }
    finalBattle() {
        console.log("Start final struggle")
        this.viiksekaita.play({
            loop: false,
            volume: 0.5
        });

        
        this.time.delayedCall(1000, () => {
            this.lightBeam1.setVisible(1);
            this.lightBeam2.setVisible(1);
        }, [], this);
        

        this.time.delayedCall(1000, () => {
            this.norppa_attack_2();
        }, [], this);

        this.time.delayedCall(4000, () => {
            this.norppa_attack();
        }, [], this);

        this.time.delayedCall(11000, () => {
            this.norppa_attack_2();
            
        }, [], this);

        // Three norppa shots
        this.time.delayedCall(14000, () => {
            this.norppa_attack_3(game.config.width*0.25, game.config.height*0.2);
        }, [], this);

        this.time.delayedCall(14500, () => {
            this.norppa_attack_3(game.config.width*0.5, game.config.height*0.2);
        }, [], this);

        this.time.delayedCall(15000, () => {
            this.norppa_attack_3(game.config.width*0.75, game.config.height*0.2);
        }, [], this);

        // Sponge attacks
        this.time.delayedCall(20000, () => {
            this.sponge_attack();
        }, [], this);

        this.time.delayedCall(25000, () => {
            this.sponge_attack();
        }, [], this);

        this.time.delayedCall(30000, () => {
            this.sponge_attack();
        }, [], this);


        this.time.delayedCall(18000, () => {
            this.man_1.setVisible(1);
            this.man_2.setVisible(1);
            this.man_3.setVisible(1);

            this.beer_shots_attack(this.man_1)
            this.beer_shots_attack(this.man_2)
            this.beer_shots_attack(this.man_3)
        }, [], this);

        this.time.delayedCall(33000, () => {
            
            this.tweens.killTweensOf(this.man_1, this.man_2, this.man_3)
            this.man_1.setActive(0).setVisible(0);
            this.man_2.setActive(0).setVisible(0);
            this.man_3.setActive(0).setVisible(0);

            this.man_1.destroy()
            this.man_2.destroy()
            this.man_3.destroy()

        }, [], this);

        this.time.delayedCall(34000, () => {
            this.lightBeam1.setVisible(0);
            this.lightBeam2.setVisible(0);
            this.Epic_finale_theme.play({
                loop: false,
                volume: 2
            });
        }, [], this);

        this.time.delayedCall(35000, () => {
            this.left_platform.setActive(1).enableBody(true, this.left_platform.x, this.left_platform.y, true, true).setVisible(1);
        }, [], this);

        this.time.delayedCall(36500, () => {
            this.right_platform.setActive(1).enableBody(true, this.right_platform.x, this.right_platform.y, true, true).setVisible(1);
        }, [], this);

        this.time.delayedCall(38000, () => {
            this.left_platform_2.setActive(1).enableBody(true, this.left_platform_2.x, this.left_platform_2.y, true, true).setVisible(1);
        }, [], this);

        this.time.delayedCall(39500, () => {
            this.right_platform_2.setActive(1).enableBody(true, this.right_platform_2.x, this.right_platform_2.y, true, true).setVisible(1);
        }, [], this);

        // The final battle starts. Just one infinite attack for now with the boss staying still
        this.time.delayedCall(42000, () => {

            this.bossHealthBar.setVisible(1);
            this.bossHealthText.setVisible(1);

            this.starBoss.setVisible(1);
            this.starBoss.setActive(1);

            this.spawn_360_intro();
        
        }, [], this);

        this.time.delayedCall(46000, () => {
            this.spawn_random360();
        }, [], this);


        this.time.delayedCall(55000, () => {
            this.spawn_fixed_360(this.starBoss.x, this.starBoss.y, 20);
        }, [], this);

        this.time.delayedCall(140000, () => {
            this.spike_rain(1);
        }, [], this);

        
        this.time.delayedCall(240000, () => {
            this.starBoss.setScale(20);
        }, [], this);

        this.time.delayedCall(241000, () => {
            this.starBoss.setScale(30);
        }, [], this);

        this.time.delayedCall(242000, () => {
            this.starBoss.setScale(40);
        }, [], this);

        this.time.delayedCall(243000, () => {
            this.starBoss.setScale(50);
        }, [], this);

        this.time.delayedCall(245000, () => {
            this.starBoss.setScale(70);
        }, [], this);
        

    }

    update() {
        // Handle player movement
        if (this.cursors.left.isDown) {
            this.dude.body.velocity.x = -gameOptions.dudeSpeed
            this.dude.anims.play("left", true)
            this.facingRight = false; // Player is facing left
        
        } else if (this.cursors.right.isDown) {
            this.dude.body.velocity.x = gameOptions.dudeSpeed
            this.dude.anims.play("right", true)
            this.facingRight = true; // Player is facing right
        
        } else {
            this.dude.body.velocity.x = 0
            if (this.facingRight) {
                this.dude.anims.play("halt_right", true)
            } else {
                this.dude.anims.play("halt_left", true)
            }
        }
        // Target follows player. (Most of the time this is invisible)
        this.target.x = this.dude.x;
        this.target.y = this.dude.y;

        // Jump and double jump logic
        if (Phaser.Input.Keyboard.JustDown(this.jumpKey) || Phaser.Input.Keyboard.JustDown(this.jumpKey_2)) {
            if (this.dude.body.touching.down) {
                this.dude.body.velocity.y = -600; // Perform first jump
                this.jump.play({
                    loop: false,
                    volume: 3
                });
                this.doubleJump = true;
            } 
            else if (this.doubleJump) {
                this.dude.body.velocity.y = -600; // Perform double jump
                this.jump.play({
                    loop: false,
                    volume: 3
                });
                this.doubleJump = false; 
            }
        }

        if (this.dude.body.touching.down) {
            this.doubleJump = true;
        }

        // Shooting with X
        if ((Phaser.Input.Keyboard.JustDown(this.shootKey) || Phaser.Input.Keyboard.JustDown(this.shootKey_2)) && this.bulletsOnScreen < this.bulletCap) {
            this.shoot();
            if (this.facingRight) {
                this.dude.anims.play("shoot_right", true)
            }
            else {
                this.dude.anims.play("shoot_left", true)
            }
            this.bulletsOnScreen += 1
        }

        if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
            this.refreshScreen()
        }

        // Remove bullets and stars when they leave the screen
        this.bulletGroup.children.each((bullet) => {
            if (bullet.x > game.config.width || bullet.x < 0) {
                bullet.destroy(); // Destroy bullets when they go off-screen
                this.bulletsOnScreen -= 1; // Decrease bullet count
            }
        }, this);

        this.norppaGroup.children.each((norppa) => {
            if (norppa.x > game.config.width || norppa.x < 0) {
                norppa.destroy();
            }
            if (norppa.y > game.config.height || norppa.y < 0) {
                norppa.destroy();
            }
        }, this);

        this.starsGroup.children.each((star) => {
            if (star.x > game.config.width || star.x < 0) {
                star.destroy();
            }
            if (star.y > game.config.height || star.y < 0) {
                star.destroy();
            }
        }, this);


        // Game end conditions
        if (this.dude.y > game.config.height || this.dude.y < 0) {
            this.viiksekaita.stop();
            this.Epic_finale_theme.stop();
            this.death_sound.play({
                loop: false,
                volume: 1
            });
            this.scene.start("EndGame")
        }
        if (this.playerHealth <= 0) {
            this.viiksekaita.stop();
            this.Epic_finale_theme.stop();
            this.death_sound.play({
                loop: false,
                volume: 1
            });
            this.scene.start("EndGame")
        }
        if (this.bossHealth <= 0) {
            this.viiksekaita.stop();
            this.Epic_finale_theme.stop();
            this.can_attack = false;
            this.scene.start("WinGame")
        }
    }
}
